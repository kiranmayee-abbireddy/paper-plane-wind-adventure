class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.setupCanvas();
        
        // Game states
        this.gameStarted = false;
        this.gamePaused = false;
        this.gameOver = false;
        
        // Initialize game objects
        this.plane = {
            x: this.canvas.width / 2,
            y: this.canvas.height / 2,
            width: 30,
            height: 20,
            velocity: { x: 0, y: 0 },
            rotation: 0
        };
        
        // Event listeners
        this.setupEventListeners();
        
        // Start game loop
        this.gameLoop();
    }

    setupCanvas() {
        // Set canvas size to match container
        this.canvas.width = this.canvas.offsetWidth;
        this.canvas.height = this.canvas.offsetHeight;
    }

    setupEventListeners() {
        // Start button
        document.getElementById('start-btn').addEventListener('click', () => {
            this.startGame();
        });

        // Mouse/touch events for wind control
        this.canvas.addEventListener('mousemove', (e) => {
            if (this.gameStarted && !this.gamePaused) {
                this.handleWindControl(e);
            }
        });
    }

    startGame() {
        this.gameStarted = true;
        document.getElementById('start-screen').classList.add('hidden');
        document.getElementById('game-ui').classList.remove('hidden');
    }

    handleWindControl(e) {
        // Get mouse position relative to canvas
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Calculate wind direction and force
        // This is a basic implementation that will need refinement
        const dx = mouseX - this.plane.x;
        const dy = mouseY - this.plane.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Apply wind force to plane
        const force = 0.1;
        this.plane.velocity.x += (dx / distance) * force;
        this.plane.velocity.y += (dy / distance) * force;
    }

    update() {
        if (!this.gameStarted || this.gamePaused) return;

        // Apply gravity
        this.plane.velocity.y += 0.2;

        // Apply friction
        this.plane.velocity.x *= 0.98;
        this.plane.velocity.y *= 0.98;

        // Update position
        this.plane.x += this.plane.velocity.x;
        this.plane.y += this.plane.velocity.y;

        // Keep plane in bounds
        this.keepPlaneInBounds();
    }

    keepPlaneInBounds() {
        if (this.plane.x < 0) this.plane.x = 0;
        if (this.plane.x > this.canvas.width) this.plane.x = this.canvas.width;
        if (this.plane.y < 0) this.plane.y = 0;
        if (this.plane.y > this.canvas.height) this.plane.y = this.canvas.height;
    }

    draw() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw plane
        this.ctx.save();
        this.ctx.translate(this.plane.x, this.plane.y);
        this.ctx.rotate(this.plane.rotation);
        
        // Simple triangle for the plane
        this.ctx.beginPath();
        this.ctx.moveTo(-15, 0);
        this.ctx.lineTo(15, 0);
        this.ctx.lineTo(0, -10);
        this.ctx.closePath();
        this.ctx.fillStyle = 'white';
        this.ctx.fill();
        this.ctx.strokeStyle = 'black';
        this.ctx.stroke();
        
        this.ctx.restore();
    }

    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Start the game when the page loads
window.addEventListener('load', () => {
    new Game();
}); 