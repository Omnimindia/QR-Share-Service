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
    
    // Copy link button - text tab
    const copyBtn = document.getElementById('copy-btn');
    copyBtn.addEventListener('click', () => copyShareLink('share-url', 'copy-btn'));
    
    // Copy link button - video tab
    const videoCopyBtn = document.getElementById('video-copy-btn');
    videoCopyBtn.addEventListener('click', () => copyShareLink('video-share-url', 'video-copy-btn'));
    
    // Download QR code button - text tab
    const downloadBtn = document.getElementById('download-btn');
    downloadBtn.addEventListener('click', () => downloadQRCode('qrcode'));
    
    // Download QR code button - video tab
    const videoDownloadBtn = document.getElementById('video-download-btn');
    videoDownloadBtn.addEventListener('click', () => downloadQRCode('video-qrcode'));
    
    // Create new button - text tab
    const createNewBtn = document.getElementById('create-new-btn');
    createNewBtn.addEventListener('click', () => resetForm('text'));
    
    // Create new button - video tab
    const videoCreateNewBtn = document.getElementById('video-create-new-btn');
    videoCreateNewBtn.addEventListener('click', () => resetForm('video'));
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
        const expirationDays = parseInt(expirationSelect.value);
        
        if (!content) {
            alert('Please enter some content to share.');
            return;
        }
        
        // Generate a unique ID for this content
        const contentId = generateUniqueId();
        
        // Store the content in localStorage
        saveContent(contentId, {
            type: 'text',
            data: content
        }, expirationDays);
        
        // Generate the share URL with the content encoded for short text
        // This ensures it works even if localStorage fails
        const encodedContent = encodeURIComponent(content);
        let shareUrl = getShareUrl(contentId);
        
        // Only append the content for text that's not too long
        if (content.length <= 500) {
            shareUrl += `&text=${encodedContent}`;
        }
        
        shareUrlInput.value = shareUrl;
        
        // Generate the QR code
        generateQRCodeImage(qrcodeDiv, shareUrl);
        
        // Show the result
        resultDiv.classList.remove('hidden');
    } else if (contentType === 'video') {
        // Handle video content
        const videoSource = document.querySelector('input[name="video-source"]:checked').value;
        const expirationSelect = document.getElementById('expiration-video');
        const resultDiv = document.getElementById('video-result');
        const qrcodeDiv = document.getElementById('video-qrcode');
        const shareUrlInput = document.getElementById('video-share-url');
        
        const expirationDays = parseInt(expirationSelect.value);
        
        // Generate a unique ID for this content
        const contentId = generateUniqueId();
        
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
            
            // Generate the share URL - for video URLs, we can include it in the URL parameters
            let shareUrl = getShareUrl(contentId);
            
            // For YouTube/Vimeo URLs, we can include them directly in the URL
            if (isYouTubeUrl(videoUrl) || isVimeoUrl(videoUrl)) {
                shareUrl += `&videoUrl=${encodeURIComponent(videoUrl)}`;
            }
            
            shareUrlInput.value = shareUrl;
            
            // Generate the QR code
            generateQRCodeImage(qrcodeDiv, shareUrl);
            
            // Show the result
            resultDiv.classList.remove('hidden');
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
        }
    }
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
    window.location.href = getShareUrl(contentId);
}

// Show shared content on the view page
function showSharedContent(contentId) {
    // Hide the main interface
    document.querySelector('main').classList.add('hidden');
    
    // Show the view container
    const viewContainer = document.getElementById('view-container');
    viewContainer.classList.remove('hidden');
    
    // Check URL parameters for direct content
    const urlParams = new URLSearchParams(window.location.search);
    const textContent = urlParams.get('text');
    const videoUrl = urlParams.get('videoUrl');
    
    // Try to get the content from localStorage first
    let content = getContent(contentId);
    
    // If we don't have content from localStorage but have text in URL params
    if (!content && textContent) {
        // Create a synthetic content object
        content = {
            id: contentId,
            type: 'text',
            data: decodeURIComponent(textContent),
            created: new Date().toISOString(),
            expires: null
        };
    }
    
    // If we don't have content but have video URL in params
    if (!content && videoUrl) {
        // Create a synthetic content object for video
        content = {
            id: contentId,
            type: 'video',
            source: 'url',
            data: decodeURIComponent(videoUrl),
            created: new Date().toISOString(),
            expires: null
        };
    }
    
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
        document.getElementById('content-input').value = '';
        document.getElementById('result').classList.add('hidden');
    } else if (type === 'video') {
        document.getElementById('video-file-input').value = '';
        document.getElementById('video-url-input').value = '';
        document.getElementById('video-result').classList.add('hidden');
    }
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
    let contentArray = [];
    try {
        contentArray = JSON.parse(localStorage.getItem('qr-share-content') || '[]');
    } catch (e) {
        console.error('Error parsing localStorage data:', e);
        contentArray = [];
    }
    
    // Add the new content
    contentArray.push(contentObj);
    
    // Clean up expired content
    contentArray = contentArray.filter(item => {
        if (!item.expires) return true;
        return new Date(item.expires) > now;
    });
    
    // Save back to localStorage (with error handling)
    try {
        localStorage.setItem('qr-share-content', JSON.stringify(contentArray));
        
        // Debug: Also encode the content directly in the URL for testing
        if (contentData.type === 'text') {
            // For text, we can encode it directly in the URL as a fallback
            localStorage.setItem(`qr-share-item-${id}`, JSON.stringify(contentObj));
        }
    } catch (e) {
        console.error('Error saving to localStorage:', e);
        alert('There was an error saving your content. Please try again or use a different browser.');
    }
}

// Get content from localStorage
function getContent(id) {
    // Try to get from the array first
    let contentArray = [];
    try {
        contentArray = JSON.parse(localStorage.getItem('qr-share-content') || '[]');
    } catch (e) {
        console.error('Error parsing localStorage data:', e);
        contentArray = [];
    }
    
    const now = new Date();
    
    // Find the content by ID
    let content = contentArray.find(item => item.id === id);
    
    // If not found in the array, try the direct item
    if (!content) {
        try {
            const directItem = localStorage.getItem(`qr-share-item-${id}`);
            if (directItem) {
                content = JSON.parse(directItem);
            }
        } catch (e) {
            console.error('Error getting direct item:', e);
        }
    }
    
    // Check URL parameters for encoded content (fallback for text content)
    if (!content) {
        const urlParams = new URLSearchParams(window.location.search);
        const textContent = urlParams.get('text');
        
        if (textContent && id) {
            // Create a synthetic content object from URL parameters
            content = {
                id: id,
                type: 'text',
                data: decodeURIComponent(textContent),
                created: new Date().toISOString(),
                expires: null
            };
        }
    }
    
    // Check if it exists and hasn't expired
    if (content && (!content.expires || new Date(content.expires) > now)) {
        return content;
    }
    
    return null;
}

// Get the share URL for a content ID
function getShareUrl(id) {
    // Get the base URL (domain and path)
    const baseUrl = window.location.href.split('?')[0];
    // Return the URL with the id parameter
    return `${baseUrl}?id=${id}`;
}

// Format a date for display
function formatDate(date) {
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}