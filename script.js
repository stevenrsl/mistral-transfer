/**
 * Mistral Transfer
 * Client WebDAV pour le transfert de fichiers
 * Design inspiré de: Squoosh, TinyPNG, Raycast
 * 100% côté client - Vanilla JS
 */

// ========================================
// WEBDAV CLIENT
// ========================================

class WebDAVClient {
    constructor(baseUrl, username, password) {
        this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        this.username = username;
        this.password = password;
        this.currentPath = '';
        this.authHeader = this._getAuthHeader();
    }

    _getAuthHeader() {
        const credentials = btoa(`${this.username}:${this.password}`);
        return `Basic ${credentials}`;
    }

    async request(method, path, body = null, headers = {}) {
        const url = `${this.baseUrl}${path}`;
        const options = {
            method: method,
            headers: {
                'Authorization': this.authHeader,
                'Content-Type': 'application/xml',
                ...headers
            }
        };

        if (body) {
            options.body = body;
        }

        try {
            const response = await fetch(url, options);
            
            if (!response.ok) {
                const error = new Error(`WebDAV Error: ${response.status} ${response.statusText}`);
                error.status = response.status;
                error.response = response;
                throw error;
            }

            return await response.text();
        } catch (error) {
            console.error('WebDAV request failed:', error);
            throw error;
        }
    }

    async listDirectory(path = '') {
        const fullPath = path || '/';
        const requestBody = `<?xml version="1.0" encoding="utf-8" ?>
<D:searchxmlns:D="DAV:">
  <D:basicsearch>
    <D:select>
      <D:prop>
        <D:displayname/>
        <D:getlastmodified/>
        <D:getcontentlength/>
        <D:getcontenttype/>
        <D:resourcetype/>
      </D:prop>
    </D:select>
    <D:from>
      <D:scope>
        <D:href>${fullPath}</D:href>
        <D:depth>1</D:depth>
      </D:scope>
    </D:from>
  </D:basicsearch>
</D:search>`;

        const response = await this.request('SEARCH', fullPath, requestBody, {
            'Content-Type': 'text/xml'
        });

        return this._parseListResponse(response);
    }

    _parseListResponse(xmlString) {
        const items = [];
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
        const responses = xmlDoc.getElementsByTagName('D:response');

        for (let i = 0; i < responses.length; i++) {
            const response = responses[i];
            const href = response.getElementsByTagName('D:href')[0]?.textContent || '';
            const propstat = response.getElementsByTagName('D:propstat')[0];
            
            if (!propstat) continue;

            const prop = propstat.getElementsByTagName('D:prop')[0];
            const status = propstat.getElementsByTagName('D:status')[0]?.textContent || '';

            if (status.includes('200 OK')) {
                const displayName = prop.getElementsByTagName('D:displayname')[0]?.textContent || '';
                const lastModified = prop.getElementsByTagName('D:getlastmodified')[0]?.textContent || '';
                const contentLength = prop.getElementsByTagName('D:getcontentlength')[0]?.textContent || '0';
                const contentType = prop.getElementsByTagName('D:getcontenttype')[0]?.textContent || '';
                const resourceType = prop.getElementsByTagName('D:resourcetype')[0];
                
                const isDirectory = resourceType?.getElementsByTagName('D:collection').length > 0;
                
                // Extract path from href
                let path = href;
                if (this.baseUrl && path.startsWith(this.baseUrl)) {
                    path = path.substring(this.baseUrl.length);
                }
                path = path.replace(/^\//, '');

                // Skip the root itself
                if (path === '' || path === '/') continue;

                items.push({
                    name: displayName || path.split('/').pop(),
                    path: path,
                    isDirectory: isDirectory,
                    size: parseInt(contentLength) || 0,
                    type: isDirectory ? 'directory' : this._getFileType(contentType),
                    lastModified: lastModified
                });
            }
        }

        return items;
    }

    _getFileType(contentType) {
        if (contentType.startsWith('image/')) return 'image';
        if (contentType.startsWith('video/')) return 'video';
        if (contentType.startsWith('audio/')) return 'audio';
        if (contentType === 'application/pdf') return 'pdf';
        if (contentType === 'text/plain') return 'txt';
        return 'file';
    }

    async getFile(path) {
        const response = await fetch(`${this.baseUrl}${path}`, {
            method: 'GET',
            headers: {
                'Authorization': this.authHeader
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to get file: ${response.status}`);
        }

        return response.blob();
    }

    async uploadFile(path, file) {
        const fullPath = `${path}/${file.name}`;
        
        const response = await fetch(`${this.baseUrl}${fullPath}`, {
            method: 'PUT',
            headers: {
                'Authorization': this.authHeader,
                'Content-Type': file.type || 'application/octet-stream'
            },
            body: file
        });

        if (!response.ok) {
            throw new Error(`Failed to upload file: ${response.status}`);
        }

        return response;
    }

    async createDirectory(path) {
        const fullPath = path.endsWith('/') ? path : `${path}/`;
        
        const response = await fetch(`${this.baseUrl}${fullPath}`, {
            method: 'MKCOL',
            headers: {
                'Authorization': this.authHeader
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to create directory: ${response.status}`);
        }

        return response;
    }

    async delete(path, isDirectory = false) {
        const response = await fetch(`${this.baseUrl}${path}`, {
            method: 'DELETE',
            headers: {
                'Authorization': this.authHeader
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to delete: ${response.status}`);
        }

        return response;
    }

    async move(sourcePath, destinationPath) {
        const response = await fetch(`${this.baseUrl}${sourcePath}`, {
            method: 'MOVE',
            headers: {
                'Authorization': this.authHeader,
                'Destination': `${this.baseUrl}${destinationPath}`
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to move: ${response.status}`);
        }

        return response;
    }

    async getFileInfo(path) {
        try {
            const response = await fetch(`${this.baseUrl}${path}`, {
                method: 'HEAD',
                headers: {
                    'Authorization': this.authHeader
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to get file info: ${response.status}`);
            }

            return {
                size: parseInt(response.headers.get('Content-Length')) || 0,
                type: response.headers.get('Content-Type') || '',
                lastModified: response.headers.get('Last-Modified') || ''
            };
        } catch (error) {
            console.error('Error getting file info:', error);
            throw error;
        }
    }
}

// ========================================
// CONFIGURATION & STATE
// ========================================

const DEFAULT_CONFIG = {
    theme: 'light',
    connections: []
};

let appState = {
    config: { ...DEFAULT_CONFIG },
    client: null,
    currentPath: '',
    files: [],
    uploadQueue: [],
    isConnected: false,
    isUploading: false,
    stats: {
        uploadCount: 0,
        downloadCount: 0
    }
};

// ========================================
// DOM ELEMENTS
// ========================================

const elements = {
    // Theme
    html: document.documentElement,
    themeToggle: document.getElementById('themeToggle'),
    themeIcon: document.getElementById('themeIcon'),
    
    // Connection
    connectionSection: document.getElementById('connectionSection'),
    explorerSection: document.getElementById('explorerSection'),
    emptyState: document.getElementById('emptyState'),
    connectionForm: document.getElementById('connectionForm'),
    serverUrl: document.getElementById('serverUrl'),
    username: document.getElementById('username'),
    password: document.getElementById('password'),
    passwordIcon: document.getElementById('passwordIcon'),
    connectBtn: document.getElementById('connectBtn'),
    savedConnections: document.getElementById('savedConnections'),
    connectionsList: document.getElementById('connectionsList'),
    
    // Explorer
    breadcrumb: document.getElementById('breadcrumb'),
    filesContainer: document.getElementById('filesContainer'),
    filesLoading: document.getElementById('filesLoading'),
    emptyFolder: document.getElementById('emptyFolder'),
    filesGrid: document.getElementById('filesGrid'),
    transferStats: document.getElementById('transferStats'),
    
    // Stats
    uploadCount: document.getElementById('uploadCount'),
    downloadCount: document.getElementById('downloadCount'),
    folderCount: document.getElementById('folderCount'),
    fileCount: document.getElementById('fileCount'),
    
    // Toast
    toast: document.getElementById('toast'),
    toastIcon: document.getElementById('toastIcon'),
    toastMessage: document.getElementById('toastMessage'),
    
    // Modals
    uploadModal: document.getElementById('uploadModal'),
    createFolderModal: document.getElementById('createFolderModal'),
    renameModal: document.getElementById('renameModal'),
    confirmModal: document.getElementById('confirmModal'),
    processingModal: document.getElementById('processingModal'),
    
    // Upload modal elements
    uploadDropZone: document.getElementById('uploadDropZone'),
    fileUploadInput: document.getElementById('fileUploadInput'),
    uploadProgress: document.getElementById('uploadProgress'),
    uploadProgressBar: document.getElementById('uploadProgressBar'),
    uploadFileList: document.getElementById('uploadFileList'),
    startUploadBtn: document.getElementById('startUploadBtn'),
    
    // Other modal elements
    folderName: document.getElementById('folderName'),
    renameInput: document.getElementById('renameInput'),
    confirmTitle: document.getElementById('confirmTitle'),
    confirmMessage: document.getElementById('confirmMessage'),
    processingTitle: document.getElementById('processingTitle'),
    processingMessage: document.getElementById('processingMessage'),
    processingProgressBar: document.getElementById('processingProgressBar')
};

// Action references
let pendingAction = null;

// ========================================
// INITIALIZATION
// ========================================

function init() {
    setupEventListeners();
    loadConfig();
    loadTheme();
    renderSavedConnections();
    showEmptyState();
}

// ========================================
// THEME MANAGEMENT
// ========================================

function loadTheme() {
    const savedTheme = localStorage.getItem('mistralTransferTheme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme) {
        elements.html.classList = savedTheme;
        updateThemeIcon(savedTheme);
    } else if (prefersDark) {
        elements.html.classList.add('dark');
        updateThemeIcon('dark');
    }
}

function toggleTheme() {
    const isDark = elements.html.classList.contains('dark');
    const newTheme = isDark ? 'light' : 'dark';
    
    elements.html.classList = newTheme;
    localStorage.setItem('mistralTransferTheme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    if (!elements.themeIcon) return;
    elements.themeIcon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}

// ========================================
// CONFIGURATION
// ========================================

function loadConfig() {
    const savedConfig = localStorage.getItem('mistralTransferConfig');
    if (savedConfig) {
        try {
            const config = JSON.parse(savedConfig);
            appState.config = { ...appState.config, ...config };
        } catch (e) {
            console.error('Error loading config:', e);
        }
    }
}

function saveConfig() {
    localStorage.setItem('mistralTransferConfig', JSON.stringify(appState.config));
}

function saveConnection(url, username) {
    // Don't save password, only URL and username
    const connection = { url, username };
    
    // Check if already exists
    const index = appState.config.connections.findIndex(
        c => c.url === url && c.username === username
    );
    
    if (index === -1) {
        appState.config.connections.unshift(connection);
    } else {
        // Move to front
        const [existing] = appState.config.connections.splice(index, 1);
        appState.config.connections.unshift(existing);
    }
    
    // Keep only last 5 connections
    if (appState.config.connections.length > 5) {
        appState.config.connections.pop();
    }
    
    saveConfig();
    renderSavedConnections();
}

function removeConnection(index) {
    appState.config.connections.splice(index, 1);
    saveConfig();
    renderSavedConnections();
}

function renderSavedConnections() {
    if (!elements.connectionsList) return;
    
    elements.connectionsList.innerHTML = '';
    
    if (appState.config.connections.length === 0) {
        elements.savedConnections.style.display = 'none';
        return;
    }
    
    elements.savedConnections.style.display = 'block';
    
    appState.config.connections.forEach((conn, index) => {
        const div = document.createElement('div');
        div.className = 'connection-item';
        div.innerHTML = `
            <i class="fas fa-history"></i>
            <span>${conn.username}@${new URL(conn.url).hostname}</span>
            <button class="delete-btn" onclick="removeConnection(${index})" title="Supprimer">
                <i class="fas fa-trash"></i>
            </button>
        `;
        div.onclick = () => useSavedConnection(index);
        elements.connectionsList.appendChild(div);
    });
}

function useSavedConnection(index) {
    const conn = appState.config.connections[index];
    elements.serverUrl.value = conn.url;
    elements.username.value = conn.username;
    elements.password.value = '';
    elements.password.focus();
}

// ========================================
// EVENT LISTENERS
// ========================================

function setupEventListeners() {
    // Theme toggle
    if (elements.themeToggle) {
        elements.themeToggle.onclick = toggleTheme;
    }

    // Connection form
    if (elements.connectionForm) {
        elements.connectionForm.onsubmit = (e) => {
            e.preventDefault();
            connectWebDAV(e);
        };
    }

    // Toggle password visibility
    if (elements.passwordIcon) {
        elements.passwordIcon.onclick = togglePasswordVisibility;
    }

    // File upload input
    if (elements.fileUploadInput) {
        elements.fileUploadInput.addEventListener('change', handleFileSelection);
    }

    // Upload drop zone
    if (elements.uploadDropZone) {
        elements.uploadDropZone.addEventListener('dragover', handleDragOver);
        elements.uploadDropZone.addEventListener('dragleave', handleDragLeave);
        elements.uploadDropZone.addEventListener('drop', handleDrop);
    }

    // Close modals on escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeAllModals();
        }
    });

    // Auto-hide toast
    setTimeout(hideToast, 3000);
}

function togglePasswordVisibility() {
    const type = elements.password.type === 'password' ? 'text' : 'password';
    elements.password.type = type;
    elements.passwordIcon.className = type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
}

// ========================================
// CONNECTION
// ========================================

async function connectWebDAV(e) {
    if (e) e.preventDefault();
    
    const url = elements.serverUrl.value.trim();
    const username = elements.username.value.trim();
    const password = elements.password.value;
    
    if (!url || !username || !password) {
        showToast('Veuillez remplir tous les champs', 'error');
        return;
    }
    
    try {
        // Test the connection first
        showProcessingModal('Connexion en cours', 'Vérification du serveur WebDAV...');
        
        const client = new WebDAVClient(url, username, password);
        await client.listDirectory('/');
        
        // Connection successful
        appState.client = client;
        appState.currentPath = '';
        appState.isConnected = true;
        
        // Save connection (without password)
        saveConnection(url, username);
        
        // Update UI
        elements.html.classList.add('connected');
        hideProcessingModal();
        
        // Load files
        await navigateTo('');
        
        showToast('Connexion réussie !', 'success');
        
    } catch (error) {
        console.error('Connection failed:', error);
        hideProcessingModal();
        showToast(`Échec de la connexion: ${error.message}`, 'error');
    }
}

function disconnect() {
    appState.client = null;
    appState.isConnected = false;
    appState.currentPath = '';
    appState.files = [];
    
    elements.html.classList.remove('connected');
    elements.uploadModal.classList.remove('show');
    
    showEmptyState();
    showToast('Déconnecté', 'success');
}

// ========================================
// NAVIGATION
// ========================================

async function navigateTo(path) {
    if (!appState.client) {
        showToast('Veuillez vous connecter d\'abord', 'error');
        return;
    }
    
    try {
        showFilesLoading();
        hideEmptyFolder();
        
        appState.currentPath = path;
        const items = await appState.client.listDirectory(path);
        
        // Filter out the current path itself
        appState.files = items.filter(item => {
            const itemPath = item.path || item.name;
            return itemPath !== path && itemPath !== `${path}/` && itemPath !== path.replace(/\/$/, '');
        });
        
        renderBreadcrumb(path);
        renderFiles();
        updateTransferStats();
        
        hideFilesLoading();
        
        if (appState.files.length === 0) {
            showEmptyFolder();
        }
        
    } catch (error) {
        console.error('Error navigating:', error);
        hideFilesLoading();
        showToast(`Erreur: ${error.message}`, 'error');
    }
}

function renderBreadcrumb(path) {
    if (!elements.breadcrumb) return;
    
    const parts = path.split('/').filter(p => p !== '');
    let html = '';
    let currentPath = '';
    
    // Root
    html += `
        <button class="breadcrumb-item" onclick="navigateTo('')">
            <i class="fas fa-folder"></i>
            <span>Racine</span>
        </button>
    `;
    
    // Path parts
    parts.forEach((part, index) => {
        currentPath += (currentPath ? '/' : '') + part;
        html += `
            <span class="breadcrumb-separator">/</span>
            <button class="breadcrumb-item" onclick="navigateTo('${currentPath}')">
                <i class="fas fa-folder"></i>
                <span>${escapeHtml(part)}</span>
            </button>
        `;
    });
    
    elements.breadcrumb.innerHTML = html;
}

function showFilesLoading() {
    if (elements.filesLoading) elements.filesLoading.style.display = 'flex';
    if (elements.emptyFolder) elements.emptyFolder.style.display = 'none';
    if (elements.filesGrid) elements.filesGrid.innerHTML = '';
}

function hideFilesLoading() {
    if (elements.filesLoading) elements.filesLoading.style.display = 'none';
}

function showEmptyFolder() {
    if (elements.emptyFolder) elements.emptyFolder.style.display = 'flex';
}

function hideEmptyFolder() {
    if (elements.emptyFolder) elements.emptyFolder.style.display = 'none';
}

// ========================================
// FILE OPERATIONS
// ========================================

async function listFiles() {
    if (!appState.client) return [];
    return await appState.client.listDirectory(appState.currentPath);
}

async function refreshFiles() {
    await navigateTo(appState.currentPath);
    showToast('Fichiers actualisés', 'success');
}

function renderFiles() {
    if (!elements.filesGrid) return;
    
    elements.filesGrid.innerHTML = '';
    
    // Sort: directories first, then files
    const sortedFiles = [...appState.files].sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
    });
    
    sortedFiles.forEach(file => {
        const card = createFileCard(file);
        elements.filesGrid.appendChild(card);
    });
}

function createFileCard(file) {
    const card = document.createElement('div');
    card.className = `file-card ${file.isDirectory ? 'directory' : ''}`;
    card.dataset.type = file.type || (file.isDirectory ? 'directory' : 'file');
    card.dataset.path = file.path;
    card.dataset.name = file.name;
    card.dataset.isDirectory = file.isDirectory;
    
    const icon = getFileIcon(file);
    const size = file.isDirectory ? '' : formatSize(file.size);
    const date = file.lastModified ? formatDate(file.lastModified) : '';
    
    card.innerHTML = `
        <div class="file-icon">
            <i class="fas ${icon}"></i>
        </div>
        <div class="file-info">
            <div class="file-name">${escapeHtml(file.name)}</div>
            <div class="file-meta">${size} ${date ? `· ${date}` : ''}</div>
        </div>
        <div class="file-actions">
            ${!file.isDirectory ? `
                <button class="file-action-btn download" onclick="downloadFile('${escapeHtml(file.path)}', '${escapeHtml(file.name)}')" title="Télécharger">
                    <i class="fas fa-download"></i>
                </button>
            ` : ''}
            <button class="file-action-btn rename" onclick="renameFile('${escapeHtml(file.path)}', '${escapeHtml(file.name)}', ${file.isDirectory})" title="Renommer">
                <i class="fas fa-edit"></i>
            </button>
            <button class="file-action-btn delete" onclick="confirmDelete('${escapeHtml(file.path)}', '${escapeHtml(file.name)}', ${file.isDirectory})" title="Supprimer">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
    
    // Navigation for directories
    if (file.isDirectory) {
        card.style.cursor = 'pointer';
        card.onclick = (e) => {
            // Don't navigate if action button was clicked
            if (e.target.closest('.file-action-btn')) return;
            navigateTo(file.path);
        };
        card.ondblclick = () => navigateTo(file.path);
    }
    
    return card;
}

function getFileIcon(file) {
    if (file.isDirectory) return 'fa-folder';
    
    const icons = {
        image: 'fa-image',
        video: 'fa-video',
        audio: 'fa-music',
        pdf: 'fa-file-pdf',
        txt: 'fa-file-alt',
        doc: 'fa-file-word',
        xls: 'fa-file-excel',
        ppt: 'fa-file-powerpoint',
        zip: 'fa-file-archive',
        code: 'fa-code'
    };
    
    if (icons[file.type]) return icons[file.type];
    
    const codeExtensions = ['js', 'html', 'css', 'py', 'java', 'c', 'cpp', 'json', 'xml'];
    if (file.name && codeExtensions.includes(file.name.split('.').pop().toLowerCase())) {
        return 'fa-code';
    }
    
    return 'fa-file';
}

function formatSize(bytes) {
    if (bytes === 0) return '0 o';
    const k = 1024;
    const sizes = ['o', 'Ko', 'Mo', 'Go'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDate(dateString) {
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-FR', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric' 
        });
    } catch (e) {
        return '';
    }
}

// ========================================
// UPLOAD FUNCTIONS
// ========================================

function showUploadModal() {
    if (!appState.isConnected) {
        showToast('Veuillez vous connecter d\'abord', 'error');
        return;
    }
    
    appState.uploadQueue = [];
    elements.uploadFileList.innerHTML = '';
    elements.uploadProgress.style.display = 'none';
    elements.startUploadBtn.disabled = true;
    
    elements.uploadModal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

function closeUploadModal() {
    elements.uploadModal.classList.remove('show');
    document.body.style.overflow = '';
    appState.uploadQueue = [];
}

function triggerFileUpload() {
    elements.fileUploadInput.click();
}

function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    elements.uploadDropZone.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    elements.uploadDropZone.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    elements.uploadDropZone.classList.remove('drag-over');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        addFilesToQueue(files);
    }
}

function handleFileSelection(e) {
    const files = e.target.files;
    if (files.length > 0) {
        addFilesToQueue(files);
        e.target.value = '';
    }
}

function addFilesToQueue(files) {
    for (let i = 0; i < files.length; i++) {
        appState.uploadQueue.push({
            file: files[i],
            status: 'pending',
            progress: 0
        });
    }
    
    renderUploadQueue();
    elements.startUploadBtn.disabled = false;
}

function renderUploadQueue() {
    if (!elements.uploadFileList) return;
    
    elements.uploadFileList.innerHTML = '';
    
    appState.uploadQueue.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = `upload-file-item ${item.status}`;
        div.innerHTML = `
            <i class="fas fa-file"></i>
            <span>${escapeHtml(item.file.name)}</span>
            <div class="progress">
                <div class="progress-bar" style="width: ${item.progress}%"></div>
            </div>
            <span class="status">${getUploadStatusText(item.status, item.progress)}</span>
        `;
        elements.uploadFileList.appendChild(div);
    });
    
    elements.uploadProgress.style.display = appState.uploadQueue.length > 0 ? 'block' : 'none';
}

function getUploadStatusText(status, progress) {
    if (status === 'pending') return 'En attente';
    if (status === 'uploading') return `${Math.round(progress)}%`;
    if (status === 'success') return 'Terminé';
    if (status === 'error') return 'Erreur';
    return '';
}

async function startUpload() {
    if (appState.uploadQueue.length === 0 || !appState.client) return;
    
    elements.startUploadBtn.disabled = true;
    appState.isUploading = true;
    
    let successCount = 0;
    
    for (let i = 0; i < appState.uploadQueue.length; i++) {
        const item = appState.uploadQueue[i];
        item.status = 'uploading';
        item.progress = 0;
        renderUploadQueue();
        
        const progressBar = elements.uploadFileList.children[i]?.querySelector('.progress-bar');
        
        try {
            const currentPath = appState.currentPath;
            const uploadPath = currentPath ? `${currentPath}/${item.file.name}` : item.file.name;
            
            // Update progress
            item.progress = 50;
            if (progressBar) progressBar.style.width = '50%';
            renderUploadQueue();
            
            await appState.client.uploadFile(currentPath, item.file);
            
            item.status = 'success';
            item.progress = 100;
            successCount++;
            
        } catch (error) {
            console.error('Upload failed:', error);
            item.status = 'error';
            item.progress = 100;
        }
        
        if (progressBar) progressBar.style.width = '100%';
        renderUploadQueue();
    }
    
    appState.isUploading = false;
    
    // Update stats
    appState.stats.uploadCount += successCount;
    updateTransferStats();
    
    showToast(`${successCount} fichier(s) uploadé(s) avec succès!`, 'success');
    
    // Refresh files
    await refreshFiles();
    
    // Reset
    appState.uploadQueue = [];
    elements.startUploadBtn.disabled = false;
    renderUploadQueue();
}

// ========================================
// DOWNLOAD FUNCTIONS
// ========================================

async function downloadFile(path, name) {
    if (!appState.client) {
        showToast('Veuillez vous connecter d\'abord', 'error');
        return;
    }
    
    try {
        showProcessingModal('Téléchargement', `Téléchargement de ${name}...`);
        
        const blob = await appState.client.getFile(path);
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
        
        hideProcessingModal();
        
        // Update stats
        appState.stats.downloadCount++;
        updateTransferStats();
        
        showToast(`Fichier téléchargé: ${name}`, 'success');
        
    } catch (error) {
        hideProcessingModal();
        console.error('Download failed:', error);
        showToast(`Erreur de téléchargement: ${error.message}`, 'error');
    }
}

// ========================================
// FOLDER FUNCTIONS
// ========================================

function createFolder() {
    if (!appState.isConnected) {
        showToast('Veuillez vous connecter d\'abord', 'error');
        return;
    }
    
    elements.folderName.value = '';
    elements.createFolderModal.classList.add('show');
    document.body.style.overflow = 'hidden';
    elements.folderName.focus();
}

function closeCreateFolderModal() {
    elements.createFolderModal.classList.remove('show');
    document.body.style.overflow = '';
}

async function confirmCreateFolder() {
    const folderName = elements.folderName.value.trim();
    if (!folderName) {
        showToast('Veuillez entrer un nom de dossier', 'error');
        return;
    }
    
    try {
        const currentPath = appState.currentPath;
        const newPath = currentPath ? `${currentPath}/${folderName}` : folderName;
        
        showProcessingModal('Création du dossier', `Création de ${folderName}...`);
        
        await appState.client.createDirectory(newPath);
        
        hideProcessingModal();
        closeCreateFolderModal();
        
        showToast(`Dossier créé: ${folderName}`, 'success');
        
        // Refresh files
        await refreshFiles();
        
    } catch (error) {
        hideProcessingModal();
        console.error('Create folder failed:', error);
        showToast(`Erreur: ${error.message}`, 'error');
    }
}

// ========================================
// RENAME & DELETE FUNCTIONS
// ========================================

function renameFile(path, name, isDirectory) {
    if (!appState.isConnected) {
        showToast('Veuillez vous connecter d\'abord', 'error');
        return;
    }
    
    elements.renameInput.value = name;
    pendingAction = { type: 'rename', path, isDirectory };
    
    elements.renameModal.classList.add('show');
    document.body.style.overflow = 'hidden';
    elements.renameInput.focus();
}

function closeRenameModal() {
    elements.renameModal.classList.remove('show');
    document.body.style.overflow = '';
    pendingAction = null;
}

async function confirmRename() {
    if (!pendingAction) return;
    
    const newName = elements.renameInput.value.trim();
    if (!newName) {
        showToast('Veuillez entrer un nom', 'error');
        return;
    }
    
    try {
        showProcessingModal('Renommage', 'Renommage en cours...');
        
        const { path, isDirectory } = pendingAction;
        const parentPath = path.substring(0, path.lastIndexOf('/'));
        const newPath = parentPath ? `${parentPath}/${newName}` : newName;
        
        await appState.client.move(path, newPath);
        
        hideProcessingModal();
        closeRenameModal();
        
        showToast('Renommage réussi', 'success');
        
        // Refresh files
        await refreshFiles();
        
    } catch (error) {
        hideProcessingModal();
        console.error('Rename failed:', error);
        showToast(`Erreur: ${error.message}`, 'error');
    }
}

function confirmDelete(path, name, isDirectory) {
    if (!appState.isConnected) {
        showToast('Veuillez vous connecter d\'abord', 'error');
        return;
    }
    
    elements.confirmTitle.textContent = `Supprimer ${isDirectory ? 'le dossier' : 'le fichier'}`;
    elements.confirmMessage.textContent = `Êtes-vous sûr de vouloir supprimer ${isDirectory ? 'le dossier' : 'le fichier'} "${name}" ? ${isDirectory ? 'Tous ses contenus seront également supprimés.' : ''}`;
    
    pendingAction = { type: 'delete', path, isDirectory, name };
    
    elements.confirmModal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

function closeConfirmModal() {
    elements.confirmModal.classList.remove('show');
    document.body.style.overflow = '';
    pendingAction = null;
}

async function confirmAction() {
    if (!pendingAction) return;
    
    try {
        showProcessingModal('Suppression', `Suppression de ${pendingAction.name}...`);
        
        await appState.client.delete(pendingAction.path, pendingAction.isDirectory);
        
        hideProcessingModal();
        closeConfirmModal();
        
        showToast(`Suppression réussie: ${pendingAction.name}`, 'success');
        
        // Refresh files
        await refreshFiles();
        
    } catch (error) {
        hideProcessingModal();
        console.error('Delete failed:', error);
        showToast(`Erreur: ${error.message}`, 'error');
    }
}

// ========================================
// STATS
// ========================================

function updateTransferStats() {
    if (elements.uploadCount) elements.uploadCount.textContent = appState.stats.uploadCount;
    if (elements.downloadCount) elements.downloadCount.textContent = appState.stats.downloadCount;
    
    const folders = appState.files.filter(f => f.isDirectory).length;
    const files = appState.files.filter(f => !f.isDirectory).length;
    
    if (elements.folderCount) elements.folderCount.textContent = folders;
    if (elements.fileCount) elements.fileCount.textContent = files;
    
    if (elements.transferStats) {
        elements.transferStats.style.display = 'grid';
    }
}

// ========================================
// UI STATE
// ========================================

function showEmptyState() {
    if (elements.emptyState) elements.emptyState.style.display = 'flex';
    if (elements.connectionSection) elements.connectionSection.style.display = 'none';
}

function hideEmptyState() {
    if (elements.emptyState) elements.emptyState.style.display = 'none';
}

function showProcessingModal(title, message) {
    elements.processingTitle.textContent = title;
    elements.processingMessage.textContent = message;
    elements.processingProgressBar.style.width = '0%';
    elements.processingModal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

function hideProcessingModal() {
    elements.processingModal.classList.remove('show');
    document.body.style.overflow = '';
}

function closeAllModals() {
    closeUploadModal();
    closeCreateFolderModal();
    closeRenameModal();
    closeConfirmModal();
    hideProcessingModal();
}

// ========================================
// TOAST NOTIFICATIONS
// ========================================

function showToast(message, type = 'success') {
    if (elements.toastMessage) {
        elements.toastMessage.textContent = message;
    }
    
    if (elements.toastIcon) {
        elements.toastIcon.className = `fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'} toast-icon ${type}`;
    }
    
    if (elements.toast) {
        elements.toast.classList.add('show', type);
        
        clearTimeout(window.toastTimeout);
        window.toastTimeout = setTimeout(hideToast, 4000);
    }
}

function hideToast() {
    if (elements.toast) {
        elements.toast.classList.remove('show', 'success', 'error', 'info');
    }
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ========================================
// INITIALIZE
// ========================================

document.addEventListener('DOMContentLoaded', init);
