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
    if (copyBtn) {
        copyBtn.addEventListener('click', () => copyShareLink('share-url', 'copy-btn'));
    }
    
    // Copy link button - video tab
    const videoCopyBtn = document.getElementById('video-copy-btn');
    if (videoCopyBtn) {
        videoCopyBtn.addEventListener('click', () => copyShareLink('video-share-url', 'video-copy-btn'));
    }
    
    // Download QR code button
    const downloadBtn = document.getElementById('download-btn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => downloadQRCode('qrcode'));
    }
    
    // Download QR code button - video tab
    const videoDownloadBtn = document.getElementById('video-download-btn');
    if (videoDownloadBtn) {
        videoDownloadBtn.addEventListener('click', () => downloadQRCode('video-qrcode'));
    }
    
    // Create new button
    const createNewBtn = document.getElementById('create-new-btn');
    if (createNewBtn) {
        createNewBtn.addEventListener('click', () => resetForm('text'));
    }
    
    // Create new button - video tab
    const videoCreateNewBtn = document.getElementById('video-create-new-btn');
    if (videoCreateNewBtn) {
        videoCreateNewBtn.addEventListener('click', () => resetForm('video'));
    }
}

// Generate a QR code for the entered content
function generateQRCode(contentType) {
    if (contentType === 'text') {
        // Handle text content
        const contentInput = document.getElementById('content-input');
        const expirationSelect = document.getElementById('expiration-text');
        const resultDiv = document.getElementById('result');
        const qrcodeDiv = document.getElementById('qrcode');
        const shareUrlInput = document.getElementById('share-url');
        
        const content = contentInput.value.trim();
        
        if (!content) {
            alert('Please enter some content to share.');
            return;
        }
        
        // Generate the content ID
        const contentId = generateUniqueId();
        
        // IMPORTANT: Encode the content directly in the URL
        // This ensures it works even if localStorage isn't available
        let shareUrl = `${getCurrentBaseUrl()}?id=${contentId}&content=${encodeURIComponent(content)}&type=text`;
        
        // Show the share URL
        shareUrlInput.value = shareUrl;
        
        // Generate the QR code
        generateQRCodeImage(qrcodeDiv, shareUrl);
        
        // Show the result
        resultDiv.classList.remove('hidden');
    } else if (contentType === 'video') {
        // Handle video content
        const videoSource = document.querySelector('input[name="video-source"]:checked').value;
        const resultDiv = document.getElementById('video-result');
        const qrcodeDiv = document.getElementById('video-qrcode');
        const shareUrlInput = document.getElementById('video-share-url');
        
        // Generate the content ID
        const contentId = generateUniqueId();
        
        if (videoSource === 'url') {
            // Process video URL
            const videoUrl = document.getElementById('video-url-input').value.trim();
            
            if (!videoUrl) {
                alert('Please enter a video URL.');
                return;
            }
            
            // Validate URL
            try {
                new URL(videoUrl);
            } catch (e) {
                alert('Please enter a valid URL.');
                return;
            }
            
            // For YouTube/Vimeo URLs, we encode them directly in the URL
            const shareUrl = `${getCurrentBaseUrl()}?id=${contentId}&videoUrl=${encodeURIComponent(videoUrl)}&type=video`;
            
            shareUrlInput.value = shareUrl;
            
            // Generate the QR code
            generateQRCodeImage(qrcodeDiv, shareUrl);
            
            // Show the result
            resultDiv.classList.remove('hidden');
        } else {
            // For file uploads, we'll need to use localStorage since files are too large for URLs
            // But we'll inform the user this might not work across devices
            alert('Note: Uploading video files requires storing data locally. For best results across devices, use a video URL instead.');
            
            const fileInput = document.getElementById('video-file-input');
            
            if (!fileInput.files || fileInput.files.length === 0) {
                alert('Please select a video file.');
                return;
            }
            
            const file = fileInput.files[0];
            
            // Check file size (limit to 5MB for better compatibility)
            if (file.size > 5 * 1024 * 1024) {
                alert('File size exceeds 5MB. For best results, please use a video URL instead.');
                return;
            }
            
            // Read the file
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
                
                try {
                    // Store the video data in localStorage
                    localStorage.setItem(`qr-video-${contentId}`, event.target.result);
                    
                    // Create a share URL with the ID
                    const shareUrl = `${getCurrentBaseUrl()}?id=${contentId}&type=video&source=file`;
                    
                    shareUrlInput.value = shareUrl;
                    
                    // Generate the QR code
                    generateQRCodeImage(qrcodeDiv, shareUrl);
                    
                    // Show the result
                    resultDiv.classList.remove('hidden');
                    
                    // Show warning
                    alert('Video file stored locally. This QR code will only work on this device unless you share the URL directly.');
                } catch (e) {
                    alert('Error storing video: ' + e.message + '\nTry using a video URL instead for better compatibility.');
                }
            };
            
            reader.onerror = () => {
                progressContainer.classList.add('hidden');
                alert('Error reading the file. Please try again or use a video URL instead.');
            };
            
            // Start reading the file
            reader.readAsDataURL(file);
        }
    }
}

// Get the current base URL (without query parameters)
function getCurrentBaseUrl() {
    return window.location.href.split('?')[0];
}

// Generate QR code image
function generateQRCodeImage(element, data) {
    // Clear any existing QR code
    element.innerHTML = '';
    
    // Method 1: Use toCanvas (preferred method)
    try {
        QRCode.toCanvas(element, data, { width: 200 }, function(error) {
            if (error) {
                console.error('Error with toCanvas method:', error);
                tryAlternativeMethods(data);
            }
        });
    } catch(e) {
        console.error('Exception with toCanvas method:', e);
        tryAlternativeMethods(data);
    }
    
    function tryAlternativeMethods(text) {
        // Method 2: Use toDataURL
        try {
            QRCode.toDataURL(text, { width: 200 }, function(err, url) {
                if (err) {
                    console.error('Error with toDataURL method:', err);
                    useConstructorMethod(text);
                    return;
                }
                
                const img = document.createElement('img');
                img.src = url;
                element.appendChild(img);
            });
        } catch(e) {
            console.error('Exception with toDataURL method:', e);
            useConstructorMethod(text);
        }
    }
    
    function useConstructorMethod(text) {
        // Method 3: Use QRCode constructor
        try {
            new QRCode(element, {
                text: text,
                width: 200,
                height: 200
            });
        } catch(e) {
            console.error('All QR code generation methods failed:', e);
            element.innerHTML = '<p>Failed to generate QR code. Please try a different browser.</p>';
        }
    }
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
    window.location.href = `${getCurrentBaseUrl()}?id=${contentId}`;
}

// Show shared content on the view page
function showSharedContent(contentId) {
    // Hide the main interface
    const mainElement = document.querySelector('main');
    if (mainElement) {
        mainElement.classList.add('hidden');
    }
    
    // Show the view container
    const viewContainer = document.getElementById('view-container');
    if (viewContainer) {
        viewContainer.classList.remove('hidden');
    }
    
    // Get URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const contentType = urlParams.get('type');
    const textContent = urlParams.get('content');
    const videoUrl = urlParams.get('videoUrl');
    const videoSource = urlParams.get('source');
    
    let content = null;
    
    // Handle different content types
    if (contentType === 'text' && textContent) {
        // Text content is directly in the URL
        content = {
            type: 'text',
            data: decodeURIComponent(textContent),
            created: new Date().toISOString()
        };
    } else if (contentType === 'video') {
        if (videoUrl) {
            // Video URL is in the parameters
            content = {
                type: 'video',
                source: 'url',
                data: decodeURIComponent(videoUrl),
                created: new Date().toISOString()
            };
        } else if (videoSource === 'file') {
            // Try to get video file from localStorage
            try {
                const videoData = localStorage.getItem(`qr-video-${contentId}`);
                if (videoData) {
                    content = {
                        type: 'video',
                        source: 'file',
                        data: videoData,
                        created: new Date().toISOString()
                    };
                }
            } catch (e) {
                console.error('Error getting video from localStorage:', e);
            }
        }
    }
    
    if (content) {
        // Content exists, display it
        if (content.type === 'text') {
            displayTextContent(content);
        } else if (content.type === 'video') {
            displayVideoContent(content);
        }
        
        // Show the date
        document.getElementById('share-date').textContent = formatDate(new Date(content.created));
        document.getElementById('expiry-info').textContent = '';
    } else {
        // Content not found
        displayNotFoundMessage();
    }
}

// Display text content
function displayTextContent(content) {
    const textContainer = document.getElementById('text-content-container');
    const videoContainer = document.getElementById('video-content-container');
    const sharedContent = document.getElementById('shared-content');
    
    if (textContainer && videoContainer && sharedContent) {
        // Show text container, hide video container
        textContainer.classList.remove('hidden');
        videoContainer.classList.add('hidden');
        
        // Display the text content
        sharedContent.textContent = content.data;
    }
}

// Display video content
function displayVideoContent(content) {
    const textContainer = document.getElementById('text-content-container');
    const videoContainer = document.getElementById('video-content-container');
    const embedContainer = document.getElementById('video-embed-container');
    const playerContainer = document.getElementById('video-player-container');
    
    if (textContainer && videoContainer && embedContainer && playerContainer) {
        // Show video container, hide text container
        videoContainer.classList.remove('hidden');
        textContainer.classList.add('hidden');
        
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
}

// Display not found message
function displayNotFoundMessage() {
    const textContainer = document.getElementById('text-content-container');
    const videoContainer = document.getElementById('video-content-container');
    const sharedContent = document.getElementById('shared-content');
    const shareDate = document.getElementById('share-date');
    const expiryInfo = document.getElementById('expiry-info');
    
    if (textContainer && videoContainer && sharedContent) {
        // Show text container, hide video container
        textContainer.classList.remove('hidden');
        videoContainer.classList.add('hidden');
        
        // Display error message
        sharedContent.textContent = 'This content has expired or does not exist.';
        
        if (shareDate) shareDate.textContent = '';
        if (expiryInfo) expiryInfo.textContent = '';
    }
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
function copyShareLink(inputId, buttonId) {
    const shareUrlInput = document.getElementById(inputId);
    shareUrlInput.select();
    document.execCommand('copy');
    
    const copyBtn = document.getElementById(buttonId);
    copyBtn.textContent = 'Copied!';
    
    setTimeout(() => {
        copyBtn.textContent = 'Copy';
    }, 2000);
}

// Download the QR code as an image
function downloadQRCode(elementId) {
    const qrcodeElement = document.getElementById(elementId);
    const qrcodeCanvas = qrcodeElement.querySelector('canvas');
    const qrcodeImg = qrcodeElement.querySelector('img');
    
    if (qrcodeCanvas) {
        // Canvas is available, use it
        const link = document.createElement('a');
        link.download = 'qr-share.png';
        link.href = qrcodeCanvas.toDataURL('image/png');
        link.click();
    } else if (qrcodeImg) {
        // Use the image if canvas is not available
        const link = document.createElement('a');
        link.download = 'qr-share.png';
        link.href = qrcodeImg.src;
        link.click();
    } else {
        alert('Could not download QR code. Please try again in a different browser.');
    }
}

// Reset the form to create a new QR code
function resetForm(type) {
    if (type === 'text') {
        const contentInput = document.getElementById('content-input');
        const resultDiv = document.getElementById('result');
        
        if (contentInput) contentInput.value = '';
        if (resultDiv) resultDiv.classList.add('hidden');
    } else if (type === 'video') {
        const fileInput = document.getElementById('video-file-input');
        const urlInput = document.getElementById('video-url-input');
        const resultDiv = document.getElementById('video-result');
        
        if (fileInput) fileInput.value = '';
        if (urlInput) urlInput.value = '';
        if (resultDiv) resultDiv.classList.add('hidden');
    }
}

// Generate a unique ID for content
function generateUniqueId() {
    return Math.random().toString(36).substring(2, 12) + Date.now().toString(36).substring(2, 7);
}

// Format a date for display
function formatDate(date) {
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}