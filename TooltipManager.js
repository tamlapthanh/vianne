class TooltipManager {
    constructor() {
        this.tooltip = null;
        this.currentIcon = null;
        this.timeout = null;
        this.init();
    }

    init() {
        this.createTooltipElement();
    }

    createTooltipElement() {
        if (this.tooltip) return;
        
        this.tooltip = document.createElement('div');
        this.tooltip.className = 'icon-tooltip';
        this.tooltip.style.cssText = `
            position: fixed;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 12px;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.2s ease-in-out;
            z-index: 10000;
            max-width: 250px;
            word-wrap: break-word;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        `;
        document.body.appendChild(this.tooltip);
    }

    showForIcon(icon, text, event) {
        // Clear previous timeout
        this.hide();
        
        this.currentIcon = icon;
        this.tooltip.innerHTML = text;
        
        this.timeout = setTimeout(() => {
            this.updatePosition(event);
            this.tooltip.style.opacity = '1';
        }, 100);
    }

    hide() {
        clearTimeout(this.timeout);
        if (this.tooltip) {
            this.tooltip.style.opacity = '0';
        }
        this.currentIcon = null;
    }

    updatePosition(event) {
        if (!this.tooltip || !event) return;
        
        const stageRect = stage.container().getBoundingClientRect();
        const tooltipRect = this.tooltip.getBoundingClientRect();
        
        let x = event.clientX + 15;
        let y = event.clientY - 10;
        
        // Kiểm tra và điều chỉnh vị trí
        if (x + tooltipRect.width > stageRect.right) {
            x = event.clientX - tooltipRect.width - 15;
        }
        
        if (y + tooltipRect.height > stageRect.bottom) {
            y = event.clientY - tooltipRect.height - 10;
        }
        
        x = Math.max(stageRect.left + 5, x);
        y = Math.max(stageRect.top + 5, y);
        
        this.tooltip.style.left = x + 'px';
        this.tooltip.style.top = y + 'px';
    }

    destroy() {
        this.hide();
        if (this.tooltip && this.tooltip.parentNode) {
            this.tooltip.parentNode.removeChild(this.tooltip);
            this.tooltip = null;
        }
    }
}

// Khởi tạo tooltip manager
const tooltipManager = new TooltipManager();

// Sử dụng trong addPlayIcon
function addPlayIcon(x, y, width, height, iconData) {
    let icon_size = getIconSize(19);
    
    Konva.Image.fromURL(ICON_AUDIO, function (icon) {
        // ... existing icon setup code ...

        icon.on("mouseover", function (e) {
            document.body.style.cursor = "pointer";
            tooltipManager.showForIcon(icon, iconData?.tooltip || 'Play Audio', e.evt);
        });

        icon.on("mouseout", function () {
            document.body.style.cursor = "default";
            tooltipManager.hide();
        });

        icon.on("mousemove", function (e) {
            tooltipManager.updatePosition(e.evt);
        });

        // Cleanup
        icon.on('remove', function() {
            if (tooltipManager.currentIcon === icon) {
                tooltipManager.hide();
            }
        });

        // ... rest of existing code ...
    });
}

// // Cleanup khi đóng ứng dụng
// window.addEventListener('beforeunload', () => {
//     tooltipManager.destroy();
// });