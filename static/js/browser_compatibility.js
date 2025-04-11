/**
 * GlassRain Browser Compatibility Layer
 * 
 * This script provides polyfills and compatibility fixes for various browsers
 * to ensure consistent operation of GlassRain across platforms.
 */

(function() {
    'use strict';
    
    // Check if the browser supports the features we need
    const browserSupport = {
        fetch: 'fetch' in window,
        promise: 'Promise' in window,
        customEvent: 'CustomEvent' in window,
        es6: (() => {
            try {
                // Test for ES6 arrow functions, template literals, and let/const
                eval('let test = () => `test`; const x = 1;');
                return true;
            } catch (e) {
                return false;
            }
        })(),
        flexbox: (() => {
            // Simple test for flex support
            const el = document.createElement('div');
            return 'flexBasis' in el.style || 
                   'webkitFlexBasis' in el.style || 
                   'mozFlexBasis' in el.style;
        })(),
        webgl: (() => {
            // Test for WebGL support
            try {
                const canvas = document.createElement('canvas');
                return !!(window.WebGLRenderingContext && 
                    (canvas.getContext('webgl') || 
                     canvas.getContext('experimental-webgl')));
            } catch (e) {
                return false;
            }
        })()
    };
    
    // Load polyfills if needed
    function loadPolyfills() {
        const polyfills = [];
        
        if (!browserSupport.fetch) {
            polyfills.push('https://cdn.jsdelivr.net/npm/whatwg-fetch@3.6.2/dist/fetch.umd.min.js');
        }
        
        if (!browserSupport.promise) {
            polyfills.push('https://cdn.jsdelivr.net/npm/promise-polyfill@8.2.3/dist/polyfill.min.js');
        }
        
        if (!browserSupport.customEvent) {
            // Polyfill for CustomEvent for IE
            (function() {
                if (typeof window.CustomEvent === "function") return false;
                
                function CustomEvent(event, params) {
                    params = params || { bubbles: false, cancelable: false, detail: null };
                    const evt = document.createEvent('CustomEvent');
                    evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
                    return evt;
                }
                
                window.CustomEvent = CustomEvent;
            })();
        }
        
        // Load polyfills from CDN
        polyfills.forEach(src => {
            const script = document.createElement('script');
            script.src = src;
            script.async = false; // Load in order
            document.head.appendChild(script);
        });
    }
    
    // Apply CSS fixes for known browser issues
    function applyCSSFixes() {
        const style = document.createElement('style');
        style.type = 'text/css';
        
        let css = '';
        
        // Fix flexbox issues in older browsers
        if (!browserSupport.flexbox) {
            css += `
                .flex-container { display: table !important; width: 100%; }
                .flex-item { display: table-cell !important; }
            `;
        }
        
        // Fix for Safari's handling of sticky positioning
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
        if (isSafari) {
            css += `
                .sticky-element {
                    position: -webkit-sticky;
                    top: 0;
                }
                
                /* Fix for Safari's overflow scaling issues */
                .overflow-container {
                    -webkit-overflow-scrolling: touch;
                }
            `;
        }
        
        // Fix for Edge's handling of grid layout
        const isEdge = navigator.userAgent.indexOf('Edge') > -1;
        if (isEdge) {
            css += `
                .grid-container {
                    display: -ms-grid;
                }
            `;
        }
        
        // Apply the CSS fixes if needed
        if (css) {
            style.appendChild(document.createTextNode(css));
            document.head.appendChild(style);
        }
    }
    
    // Setup mobile viewport handling
    function setupMobileViewport() {
        // Ensure the viewport meta tag is present and properly configured
        let viewport = document.querySelector('meta[name="viewport"]');
        
        if (!viewport) {
            viewport = document.createElement('meta');
            viewport.name = 'viewport';
            document.head.appendChild(viewport);
        }
        
        viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
        
        // Handle iOS Safari full height issue
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        if (isIOS) {
            document.documentElement.style.height = '100%';
            document.body.style.height = '100%';
            document.body.style.minHeight = '-webkit-fill-available';
        }
    }
    
    // Initialize touch handling
    function initTouchHandling() {
        // Determine if device supports touch
        const supportsTouch = 'ontouchstart' in window || 
                             navigator.maxTouchPoints > 0 ||
                             navigator.msMaxTouchPoints > 0;
                             
        // Add appropriate class to the body
        if (supportsTouch) {
            document.body.classList.add('touch-device');
            
            // Prevent 300ms delay on iOS
            const fastClickScript = document.createElement('script');
            fastClickScript.src = 'https://cdn.jsdelivr.net/npm/fastclick@1.0.6/lib/fastclick.min.js';
            fastClickScript.onload = function() {
                if (typeof FastClick !== 'undefined') {
                    FastClick.attach(document.body);
                }
            };
            document.head.appendChild(fastClickScript);
        } else {
            document.body.classList.add('no-touch');
        }
    }
    
    // Detect WebGL support for 3D features
    function setupWebGL() {
        if (!browserSupport.webgl) {
            // Add fallback for 3D features
            document.body.classList.add('no-webgl');
            
            // Show warning for 3D features if the user tries to access them
            const model3DElements = document.querySelectorAll('.model-3d, .room-3d');
            model3DElements.forEach(element => {
                const fallbackMsg = document.createElement('div');
                fallbackMsg.className = 'webgl-warning';
                fallbackMsg.innerHTML = `
                    <div class="warning-icon">⚠️</div>
                    <div class="warning-text">
                        <h3>3D Visualization Unavailable</h3>
                        <p>Your browser doesn't support 3D visualization. Please try Chrome, Firefox, or Edge for the full experience.</p>
                    </div>
                `;
                element.appendChild(fallbackMsg);
            });
        }
    }
    
    // Detect browser capabilities and warn about unsupported features
    function detectCapabilities() {
        // Create list of unsupported features
        const unsupported = [];
        
        for (const [feature, supported] of Object.entries(browserSupport)) {
            if (!supported) {
                unsupported.push(feature);
            }
        }
        
        // If critical features are missing, show a warning
        if (unsupported.length > 0) {
            console.warn('GlassRain: Your browser is missing support for: ' + unsupported.join(', '));
            
            // Only show warning for critical features
            if (!browserSupport.fetch || !browserSupport.promise) {
                const warning = document.createElement('div');
                warning.className = 'browser-warning';
                warning.innerHTML = `
                    <div class="warning-content">
                        <h3>Browser Compatibility Issue</h3>
                        <p>Your browser may not support all features of GlassRain. For the best experience, please use Chrome, Firefox, Edge, or Safari.</p>
                        <button class="close-warning">Continue Anyway</button>
                    </div>
                `;
                
                document.body.appendChild(warning);
                
                document.querySelector('.close-warning').addEventListener('click', function() {
                    warning.style.display = 'none';
                });
            }
        }
    }
    
    // Initialize compatibility layer
    function init() {
        loadPolyfills();
        applyCSSFixes();
        setupMobileViewport();
        initTouchHandling();
        setupWebGL();
        detectCapabilities();
        
        // Add browser info to body for CSS targeting
        document.body.classList.add(
            /firefox/i.test(navigator.userAgent) ? 'firefox' :
            /chrome/i.test(navigator.userAgent) ? 'chrome' :
            /safari/i.test(navigator.userAgent) ? 'safari' :
            /edge/i.test(navigator.userAgent) ? 'edge' :
            /trident|msie/i.test(navigator.userAgent) ? 'ie' : 'other-browser'
        );
        
        // Dispatch event when compatibility layer is ready
        document.dispatchEvent(new Event('compatibility-ready'));
    }
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();