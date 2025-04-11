document.addEventListener('DOMContentLoaded', function() {
    // Create a canvas placeholder for property models
    const placeholderImage = document.querySelector('.placeholder-model');
    
    if (placeholderImage) {
        // Create a canvas element
        const canvas = document.createElement('canvas');
        canvas.width = placeholderImage.clientWidth || 800;
        canvas.height = placeholderImage.clientHeight || 400;
        canvas.className = 'placeholder-model';
        
        // Draw property model placeholder
        const ctx = canvas.getContext('2d');
        
        // Draw gradient background
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#f0f0f0');
        gradient.addColorStop(1, '#d0d0d0');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw house placeholder
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#666666';
        ctx.lineWidth = 2;
        
        // House base
        const houseX = canvas.width / 2 - 100;
        const houseY = canvas.height / 2 - 50;
        const houseWidth = 200;
        const houseHeight = 150;
        
        ctx.fillRect(houseX, houseY, houseWidth, houseHeight);
        ctx.strokeRect(houseX, houseY, houseWidth, houseHeight);
        
        // Roof
        ctx.beginPath();
        ctx.moveTo(houseX - 20, houseY);
        ctx.lineTo(houseX + houseWidth / 2, houseY - 70);
        ctx.lineTo(houseX + houseWidth + 20, houseY);
        ctx.closePath();
        ctx.fillStyle = '#CFA43B'; // GlassRain gold color
        ctx.fill();
        ctx.stroke();
        
        // Door
        ctx.fillStyle = '#67B7D1'; // GlassRain blue color
        ctx.fillRect(houseX + 80, houseY + 70, 40, 80);
        ctx.strokeRect(houseX + 80, houseY + 70, 40, 80);
        
        // Windows
        ctx.fillStyle = '#effbff';
        ctx.fillRect(houseX + 30, houseY + 30, 30, 30);
        ctx.strokeRect(houseX + 30, houseY + 30, 30, 30);
        
        ctx.fillRect(houseX + 140, houseY + 30, 30, 30);
        ctx.strokeRect(houseX + 140, houseY + 30, 30, 30);
        
        // Text
        ctx.fillStyle = '#333333';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Your Property', canvas.width / 2, canvas.height - 30);
        ctx.font = '12px Arial';
        ctx.fillText('Click "Elevate" tab to view in AR', canvas.width / 2, canvas.height - 10);
        
        // Replace image with canvas
        placeholderImage.parentNode.replaceChild(canvas, placeholderImage);
    }
});