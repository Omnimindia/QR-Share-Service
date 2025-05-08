// QR Share Application
document.addEventListener('DOMContentLoaded', () => {
    // Set current year in footer
    document.getElementById('current-year').textContent = new Date().getFullYear();
    
    // Detect if viewing a shared content page
    const urlParams = new URLSearchParams(window.location.search);
    const contentId = urlParams.get('id');
    
    if (contentId) {
        // We're on a view page, so show the content
        showSharedContent(contentId);
    } else {
        // Initialize the main application
        initApp();
    }
});

// Initialize the main application
function initApp() {
    // Tab switching functionality
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');
            
            // Update active button
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Show appropriate tab pane
            tabPanes.forEach(pane => {
                if (pane.id === `${tabId}-tab`) {
                    pane.classList.add('active');
                } else {
                    pane.classList.remove('active');
                }
            });
        });
    });
    
    // Toggle video source options
    const videoSourceRadios = document.querySelectorAll('input[name="video-source"]');
    const videoFileOption = document.getElementById('video-file-option');
    const videoUrlOption = document.getElementById('video-url-option');
    
    videoSourceRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            if (radio.value === 'file') {
                videoFileOption.classList.remove('hidden');
                videoUrlOption.classList.add('hidden');
            } else {
                videoFileOption.classList.add('hidden');
                videoUrlOption.classList.remove('hidden');
            }
        });
    });
    
    // Form submission for creating text content
    const generateTextBtn = document.getElementById('generate-text-btn');
    generateTextBtn.addEventListener('click', () => generateQRCode('text'));
    
    // Form submission for creating video content
    const generateVideoBtn = document.getElementById('generate-video-btn');
    generateVideoBtn.addEventListener('click', () => generateQRCode('video'));
    
    // Button for viewing content by ID
    const viewBtn = document.getElementById('view-btn');
    viewBtn.addEventListener('click', viewContentById);
    
    // Copy link button
    const copyBtn = document.getElementById('copy-btn');
    copyBtn.addEventListener('click', copyShareLink);
    
    // Download QR code button
    const downloadBtn = document.getElementById('download-btn');
    downloadBtn.addEventListener('click', downloadQRCode);
    
    // Create new button
    const createNewBtn = document.getElementById('create-new-btn');
    createNewBtn.addEventListener('click', resetForm);
}

// Generate a QR code for the entered content
function generateQRCode(contentType) {
    // Get common elements
    const resultDiv = document.getElementById('result');
    const qrcodeDiv = document.getElementById('qrcode');
    const shareUrlInput = document.getElementById('share-url');
    
    // Generate a unique ID for this content
    const contentId = generateUniqueId();
    
    if (contentType === 'text') {
        // Handle text content
        const contentInput = document.getElementById('content-input');
        const expirationSelect = document.getElementById('expiration-text');
        
        const content = contentInput.value.trim();
        const expirationDays = parseInt(expirationSelect.value);
        
        if (!content) {
            alert('Please enter some content to share.');
            return;
        }
        
        // Store the content in localStorage
        saveContent(contentId, {
            type: 'text',
            data: content
        }, expirationDays);
    } else if (contentType === 'video') {
        // Handle video content
        const videoSource = document.querySelector('input[name="video-source"]:checked').value;
        const expirationSelect = document.getElementById('expiration-video');
        const expirationDays = parseInt(expirationSelect.value);
        
        if (videoSource === 'url') {
            // Process video URL
            const videoUrl = document.getElementById('video-url-input').value.trim();
            
            if (!videoUrl) {
                alert('Please enter a video URL.');
                return;
            }
            
            // Validate URL
            let validVideoUrl;
            try {
                validVideoUrl = new URL(videoUrl);
            } catch (e) {
                alert('Please enter a valid URL.');
                return;
            }
            
            // Store the video URL
            saveContent(contentId, {
                type: 'video',
                source: 'url',
                data: videoUrl
            }, expirationDays);
        } else {
            // Process uploaded video file
            const fileInput = document.getElementById('video-file-input');
            
            if (!fileInput.files || fileInput.files.length === 0) {
                alert('Please select a video file.');
                return;
            }
            
            const file = fileInput.files[0];
            
            // Check file size (limit to 10MB)
            if (file.size > 10 * 1024 * 1024) {
                alert('File size exceeds the 10MB limit. Please use a smaller file or provide a video URL instead.');
                return;
            }
            
            // Read the file as data URL
            const reader = new FileReader();
            
            // Show progress
            const progressContainer = document.querySelector('.progress-container');
            const progressBar = document.querySelector('.progress-bar');
            
            progressContainer.classList.remove('hidden');
            
            reader.onprogress = (event) => {
                if (event.lengthComputable) {
                    const progress = (event.loaded / event.total) * 100;
                    progressBar.style.width = progress + '%';
                }
            };
            
            reader.onload = (event) => {
                // Hide progress
                progressContainer.classList.add('hidden');
                
                // Store the video data
                saveContent(contentId, {
                    type: 'video',
                    source: 'file',
                    data: event.target.result,
                    mimeType: file.type
                }, expirationDays);
                
                // Generate the share URL
                const shareUrl = getShareUrl(contentId);
                shareUrlInput.value = shareUrl;
                
                // Generate the QR code
                generateQRCodeImage(qrcodeDiv, shareUrl);
                
                // Show the result
                resultDiv.classList.remove('hidden');
            };
            
            reader.onerror = () => {
                progressContainer.classList.add('hidden');
                alert('Error reading the file. Please try again.');
            };
            
            // Start reading the file
            reader.readAsDataURL(file);
            
            // Exit early as the async file reading will handle the rest
            return;
        }
    }
    
    // Generate the share URL
    const shareUrl = getShareUrl(contentId);
    shareUrlInput.value = shareUrl;
    
    // Generate the QR code
    generateQRCodeImage(qrcodeDiv, shareUrl);
    
    // Show the result
    resultDiv.classList.remove('hidden');
}

// Generate QR code image
function generateQRCodeImage(element, data) {
    // Clear any existing QR code
    element.innerHTML = '';
    
    // Generate the QR code
    QRCode.toCanvas(element, data, {
        width: 200,
        margin: 1,
        color: {
            dark: '#000000',
            light: '#ffffff'
        }
    }, function(error) {
        if (error) {
            console.error('Error generating QR code:', error);
        }
    });
}

// View content by ID from the view tab
function viewContentById() {
    const contentIdInput = document.getElementById('content-id');
    const contentId = contentIdInput.value.trim();
    
    if (!contentId) {
        alert('Please enter a content ID.');
        return;
    }
    
    // Redirect to the view page
    window.location.href = getShareUrl(contentId);
}

// Show shared content on the view page
function showSharedContent(contentId) {
    // Hide the main interface
    document.querySelector('main').classList.add('hidden');
    
    // Show the view container
    const viewContainer = document.getElementById('view-container');
    viewContainer.classList.remove('hidden');
    
    // Try to get the content from localStorage
    const content = getContent(contentId);
    
    if (content) {
        // Content exists, format and display based on content type
        if (content.type === 'text') {
            displayTextContent(content);
        } else if (content.type === 'video') {
            displayVideoContent(content);
        }
        
        // Format and display the share date
        const shareDate = new Date(content.created);
        document.getElementById('share-date').textContent = formatDate(shareDate);
        
        // Display expiration info
        const expiryInfo = document.getElementById('expiry-info');
        if (content.expires) {
            const expiryDate = new Date(content.expires);
            expiryInfo.textContent = `Expires on ${formatDate(expiryDate)}`;
        } else {
            expiryInfo.textContent = 'Never expires';
        }
    } else {
        // Content not found or expired
        displayNotFoundMessage();
    }
}

// Display text content
function displayTextContent(content) {
    const textContainer = document.getElementById('text-content-container');
    const sharedContent = document.getElementById('shared-content');
    
    // Show text container, hide video container
    textContainer.classList.remove('hidden');
    document.getElementById('video-content-container').classList.add('hidden');
    
    // Display the text content
    sharedContent.textContent = content.data;
}

// Display video content
function displayVideoContent(content) {
    const videoContainer = document.getElementById('video-content-container');
    const embedContainer = document.getElementById('video-embed-container');
    const playerContainer = document.getElementById('video-player-container');
    
    // Show video container, hide text container
    videoContainer.classList.remove('hidden');
    document.getElementById('text-content-container').classList.add('hidden');
    
    if (content.source === 'url') {
        // Handle video URL
        const videoUrl = content.data;
        
        // Check if it's a YouTube or Vimeo URL
        if (isYouTubeUrl(videoUrl)) {
            // YouTube embed
            const videoId = getYouTubeVideoId(videoUrl);
            const embedUrl = `https://www.youtube.com/embed/${videoId}`;
            
            const iframe = document.getElementById('video-embed');
            iframe.src = embedUrl;
            
            embedContainer.classList.remove('hidden');
            playerContainer.classList.add('hidden');
        } else if (isVimeoUrl(videoUrl)) {
            // Vimeo embed
            const videoId = getVimeoVideoId(videoUrl);
            const embedUrl = `https://player.vimeo.com/video/${videoId}`;
            
            const iframe = document.getElementById('video-embed');
            iframe.src = embedUrl;
            
            embedContainer.classList.remove('hidden');
            playerContainer.classList.add('hidden');
        } else {
            // Direct video URL
            const videoPlayer = document.getElementById('video-player');
            videoPlayer.src = videoUrl;
            
            embedContainer.classList.add('hidden');
            playerContainer.classList.remove('hidden');
        }
    } else {
        // Handle data URL for uploaded video
        const videoData = content.data;
        const videoPlayer = document.getElementById('video-player');
        videoPlayer.src = videoData;
        
        embedContainer.classList.add('hidden');
        playerContainer.classList.remove('hidden');
    }
}

// Display not found message
function displayNotFoundMessage() {
    // Show text container, hide video container
    document.getElementById('text-content-container').classList.remove('hidden');
    document.getElementById('video-content-container').classList.add('hidden');
    
    // Display error message
    document.getElementById('shared-content').textContent = 'This content has expired or does not exist.';
    document.getElementById('share-date').textContent = '';
    document.getElementById('expiry-info').textContent = '';
}

// Check if URL is from YouTube
function isYouTubeUrl(url) {
    return url.includes('youtube.com') || url.includes('youtu.be');
}

// Get YouTube video ID from URL
function getYouTubeVideoId(url) {
    let videoId = '';
    
    if (url.includes('youtube.com')) {
        const urlParams = new URLSearchParams(new URL(url).search);
        videoId = urlParams.get('v');
    } else if (url.includes('youtu.be')) {
        videoId = url.split('/').pop();
    }
    
    return videoId;
}

// Check if URL is from Vimeo
function isVimeoUrl(url) {
    return url.includes('vimeo.com');
}

// Get Vimeo video ID from URL
function getVimeoVideoId(url) {
    let videoId = '';
    
    if (url.includes('vimeo.com')) {
        const parts = url.split('/');
        videoId = parts[parts.length - 1];
    }
    
    return videoId;
}

// Copy the share link to clipboard
function copyShareLink() {
    const shareUrlInput = document.getElementById('share-url');
    shareUrlInput.select();
    document.execCommand('copy');
    
    const copyBtn = document.getElementById('copy-btn');
    copyBtn.textContent = 'Copied!';
    
    setTimeout(() => {
        copyBtn.textContent = 'Copy';
    }, 2000);
}

// Download the QR code as an image
function downloadQRCode() {
    const qrcodeCanvas = document.querySelector('#qrcode canvas');
    if (!qrcodeCanvas) return;
    
    const link = document.createElement('a');
    link.download = 'qr-share.png';
    link.href = qrcodeCanvas.toDataURL('image/png');
    link.click();
}

// Reset the form to create a new QR code
function resetForm() {
    document.getElementById('content-input').value = '';
    document.getElementById('video-file-input').value = '';
    document.getElementById('video-url-input').value = '';
    document.getElementById('result').classList.add('hidden');
}

// Generate a unique ID for content
function generateUniqueId() {
    // Generate a random string
    const randomStr = Math.random().toString(36).substring(2, 10) + 
                      Date.now().toString(36);
    
    // Create a hash using CryptoJS
    return CryptoJS.SHA256(randomStr).toString(CryptoJS.enc.Hex).substring(0, 10);
}

// Save content to localStorage
function saveContent(id, contentData, expirationDays) {
    const now = new Date();
    const contentObj = {
        id: id,
        type: contentData.type,
        data: contentData.data,
        created: now.toISOString(),
        expires: expirationDays > 0 ? new Date(now.getTime() + expirationDays * 24 * 60 * 60 * 1000).toISOString() : null
    };
    
    // Add additional properties based on content type
    if (contentData.type === 'video') {
        contentObj.source = contentData.source;
        if (contentData.mimeType) {
            contentObj.mimeType = contentData.mimeType;
        }
    }
    
    // Get existing content array or create a new one
    let contentArray = JSON.parse(localStorage.getItem('qr-share-content') || '[]');
    
    // Add the new content
    contentArray.push(contentObj);
    
    // Clean up expired content
    contentArray = contentArray.filter(item => {
        if (!item.expires) return true;
        return new Date(item.expires) > now;
    });
    
    // Save back to localStorage
    localStorage.setItem('qr-share-content', JSON.stringify(contentArray));
}

// Get content from localStorage
function getContent(id) {
    const contentArray = JSON.parse(localStorage.getItem('qr-share-content') || '[]');
    const now = new Date();
    
    // Find the content by ID
    const content = contentArray.find(item => item.id === id);
    
    // Check if it exists and hasn't expired
    if (content && (!content.expires || new Date(content.expires) > now)) {
        return content;
    }
    
    return null;
}

// Get the share URL for a content ID
function getShareUrl(id) {
    return `${window.location.origin}${window.location.pathname}?id=${id}`;
}

// Format a date for display
function formatDate(date) {
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}