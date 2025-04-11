/**
 * GlassRain Mobile Touch Controls
 * Enhanced touch interaction for 3D models and room visualization
 */

class TouchControls {
    constructor(element, options = {}) {
        this.element = typeof element === 'string' ? document.querySelector(element) : element;
        if (!this.element) {
            console.error('Element not found for touch controls');
            return;
        }

        // Default options
        this.options = Object.assign({
            rotationSensitivity: 0.5,
            panSensitivity: 0.5,
            zoomSensitivity: 0.02,
            doubleTapZoom: true,
            inertia: true,
            maxInertia: 0.95,
            boundaryCheck: true
        }, options);

        // State variables
        this.state = {
            isActive: false,
            startX: 0,
            startY: 0,
            lastX: 0,
            lastY: 0,
            lastDistance: 0,
            velocityX: 0,
            velocityY: 0,
            rotationX: 0,
            rotationY: 0,
            zoom: 1,
            lastTap: 0,
            panOffset: { x: 0, y: 0 }
        };

        // If this is connected to Three.js/Mapbox
        this.renderer = options.renderer || null;
        this.camera = options.camera || null;
        this.scene = options.scene || null;
        this.map = options.map || null;

        // Event callbacks
        this.callbacks = {
            onRotate: options.onRotate || null,
            onPan: options.onPan || null,
            onZoom: options.onZoom || null,
            onClick: options.onClick || null,
            onDoubleTap: options.onDoubleTap || null
        };

        // Initialize
        this.init();
    }

    init() {
        // Touch events
        this.element.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        this.element.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        this.element.addEventListener('touchend', this.handleTouchEnd.bind(this));
        this.element.addEventListener('touchcancel', this.handleTouchEnd.bind(this));

        // Add visual feedback for touch
        this.addTouchFeedback();

        // If using inertia, set up animation loop
        if (this.options.inertia) {
            this.animationFrame = null;
            this.updateInertia();
        }

        // Add accessibility
        this.element.setAttribute('role', 'application');
        this.element.setAttribute('aria-label', 'Interactive 3D model viewer. Use two fingers to zoom and rotate.');
    }

    handleTouchStart(event) {
        event.preventDefault();
        
        const touches = event.touches;
        
        // Store initial touch positions
        this.state.isActive = true;
        this.state.startX = touches[0].clientX;
        this.state.startY = touches[0].clientY;
        this.state.lastX = touches[0].clientX;
        this.state.lastY = touches[0].clientY;
        this.state.velocityX = 0;
        this.state.velocityY = 0;
        
        // Check for double tap
        const now = new Date().getTime();
        const timeSince = now - this.state.lastTap;
        
        if (timeSince < 300 && touches.length === 1 && this.options.doubleTapZoom) {
            // Double tap detected
            if (this.callbacks.onDoubleTap) {
                this.callbacks.onDoubleTap(event);
            } else {
                // Default double tap behavior - zoom in centered on tap point
                this.handleDoubleTap(touches[0].clientX, touches[0].clientY);
            }
        }
        
        this.state.lastTap = now;
        
        // If two fingers, store initial distance for pinch zoom
        if (touches.length === 2) {
            const dx = touches[0].clientX - touches[1].clientX;
            const dy = touches[0].clientY - touches[1].clientY;
            this.state.lastDistance = Math.sqrt(dx * dx + dy * dy);
        }
        
        // Add active touch class for visual feedback
        this.element.classList.add('touch-active');
    }

    handleTouchMove(event) {
        if (!this.state.isActive) return;
        event.preventDefault();
        
        const touches = event.touches;
        
        // Single finger - rotation or pan
        if (touches.length === 1) {
            const deltaX = touches[0].clientX - this.state.lastX;
            const deltaY = touches[0].clientY - this.state.lastY;
            
            // Update velocity for inertia
            this.state.velocityX = deltaX * 0.1 + this.state.velocityX * 0.9;
            this.state.velocityY = deltaY * 0.1 + this.state.velocityY * 0.9;
            
            // Apply rotation
            this.state.rotationY += deltaX * this.options.rotationSensitivity;
            this.state.rotationX += deltaY * this.options.rotationSensitivity;
            
            // Apply boundary check if enabled
            if (this.options.boundaryCheck) {
                this.state.rotationX = Math.max(-45, Math.min(45, this.state.rotationX));
            }
            
            if (this.callbacks.onRotate) {
                this.callbacks.onRotate(this.state.rotationX, this.state.rotationY);
            } else if (this.map) {
                // If Mapbox is available, apply rotation
                this.map.easeTo({
                    bearing: this.state.rotationY,
                    pitch: Math.max(0, Math.min(60, 30 + this.state.rotationX)),
                    duration: 0
                });
            }
        }
        
        // Two fingers - pinch zoom
        if (touches.length === 2) {
            const dx = touches[0].clientX - touches[1].clientX;
            const dy = touches[0].clientY - touches[1].clientY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const deltaDistance = distance - this.state.lastDistance;
            
            // Calculate zoom change
            const zoomDelta = deltaDistance * this.options.zoomSensitivity;
            this.state.zoom = Math.max(0.5, Math.min(2.5, this.state.zoom + zoomDelta));
            
            if (this.callbacks.onZoom) {
                this.callbacks.onZoom(this.state.zoom);
            } else if (this.map) {
                // If Mapbox is available, apply zoom
                const currentZoom = this.map.getZoom();
                this.map.easeTo({
                    zoom: currentZoom + (zoomDelta * 5),
                    duration: 0
                });
            }
            
            this.state.lastDistance = distance;
        }
        
        // Update last position
        this.state.lastX = touches[0].clientX;
        this.state.lastY = touches[0].clientY;
    }

    handleTouchEnd(event) {
        // If inertia enabled, we'll continue some momentum
        if (this.options.inertia && (Math.abs(this.state.velocityX) > 0.5 || Math.abs(this.state.velocityY) > 0.5)) {
            // Let the inertia update handle it
        } else {
            // Reset velocities
            this.state.velocityX = 0;
            this.state.velocityY = 0;
        }
        
        this.state.isActive = false;
        this.element.classList.remove('touch-active');
    }

    handleDoubleTap(x, y) {
        // Default double tap behavior - zoom in centered on tap point
        if (this.map) {
            const currentZoom = this.map.getZoom();
            this.map.easeTo({
                zoom: currentZoom + 1,
                center: this.map.unproject([x, y]),
                duration: 300
            });
        } else {
            // Generic zoom handling
            this.state.zoom = Math.min(2.5, this.state.zoom + 0.5);
            
            if (this.callbacks.onZoom) {
                this.callbacks.onZoom(this.state.zoom);
            }
        }
    }

    updateInertia() {
        if (!this.state.isActive && (Math.abs(this.state.velocityX) > 0.05 || Math.abs(this.state.velocityY) > 0.05)) {
            // Apply inertia decay
            this.state.velocityX *= this.options.maxInertia;
            this.state.velocityY *= this.options.maxInertia;
            
            // Apply rotation from inertia
            this.state.rotationY += this.state.velocityX * this.options.rotationSensitivity;
            this.state.rotationX += this.state.velocityY * this.options.rotationSensitivity;
            
            // Apply boundary check if enabled
            if (this.options.boundaryCheck) {
                this.state.rotationX = Math.max(-45, Math.min(45, this.state.rotationX));
            }
            
            if (this.callbacks.onRotate) {
                this.callbacks.onRotate(this.state.rotationX, this.state.rotationY);
            } else if (this.map) {
                this.map.easeTo({
                    bearing: this.state.rotationY,
                    pitch: Math.max(0, Math.min(60, 30 + this.state.rotationX)),
                    duration: 0
                });
            }
        }
        
        this.animationFrame = requestAnimationFrame(this.updateInertia.bind(this));
    }

    addTouchFeedback() {
        // Create a stylesheet for touch feedback
        const style = document.createElement('style');
        style.textContent = `
            .touch-active {
                box-shadow: 0 0 0 2px var(--glassrain-gold) !important;
            }
            
            .touch-indicator {
                position: absolute;
                width: 44px;
                height: 44px;
                border-radius: 50%;
                background-color: rgba(194, 158, 73, 0.2);
                border: 2px solid var(--glassrain-gold);
                pointer-events: none;
                transform: translate(-50%, -50%);
                z-index: 9999;
                opacity: 0;
                transition: opacity 0.3s;
            }
            
            .touch-indicator.active {
                opacity: 1;
            }
        `;
        document.head.appendChild(style);
    }

    // Public methods for external control
    setRotation(x, y) {
        this.state.rotationX = x;
        this.state.rotationY = y;
        
        if (this.callbacks.onRotate) {
            this.callbacks.onRotate(this.state.rotationX, this.state.rotationY);
        }
    }

    setZoom(zoom) {
        this.state.zoom = Math.max(0.5, Math.min(2.5, zoom));
        
        if (this.callbacks.onZoom) {
            this.callbacks.onZoom(this.state.zoom);
        }
    }

    reset() {
        this.state.rotationX = 0;
        this.state.rotationY = 0;
        this.state.zoom = 1;
        this.state.panOffset = { x: 0, y: 0 };
        this.state.velocityX = 0;
        this.state.velocityY = 0;
        
        if (this.callbacks.onRotate) {
            this.callbacks.onRotate(0, 0);
        }
        
        if (this.callbacks.onZoom) {
            this.callbacks.onZoom(1);
        }
        
        if (this.callbacks.onPan) {
            this.callbacks.onPan(0, 0);
        }
    }

    destroy() {
        // Remove event listeners
        this.element.removeEventListener('touchstart', this.handleTouchStart);
        this.element.removeEventListener('touchmove', this.handleTouchMove);
        this.element.removeEventListener('touchend', this.handleTouchEnd);
        this.element.removeEventListener('touchcancel', this.handleTouchEnd);
        
        // Cancel animation frame
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        
        // Remove added attributes
        this.element.removeAttribute('role');
        this.element.removeAttribute('aria-label');
    }
}

// Export for use in other modules
window.GlassRainTouchControls = TouchControls;