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
            rotation: 0,
            maxSpeed: 5,
            gravity: 0.15,
            lift: 0.2,
            drag: 0.98
        };
        
        // Enhance wind properties
        this.wind = {
            current: { x: 0, y: 0 },
            target: { x: 0, y: 0 },
            particles: [],
            maxParticles: 50,
            // Add directional particles
            streamers: [],
            maxStreamers: 20
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
        
        // Add background to see if canvas is rendering
        this.ctx.fillStyle = '#87CEEB';  // Sky blue
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
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
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Update target wind based on mouse position
        this.wind.target = {
            x: (mouseX - this.plane.x) / this.canvas.width,
            y: (mouseY - this.plane.y) / this.canvas.height
        };

        // Create wind particles
        this.createWindParticle(mouseX, mouseY);

        // Add streamer particles
        this.createWindStreamer(mouseX, mouseY);
    }

    createWindParticle(x, y) {
        if (this.wind.particles.length >= this.wind.maxParticles) {
            this.wind.particles.shift();
        }

        this.wind.particles.push({
            x: x,
            y: y,
            age: 0,
            maxAge: 30,
            size: 5
        });
    }

    createWindStreamer(x, y) {
        if (this.wind.streamers.length >= this.wind.maxStreamers) {
            this.wind.streamers.shift();
        }

        const dx = x - this.plane.x;
        const dy = y - this.plane.y;
        const angle = Math.atan2(dy, dx);
        
        this.wind.streamers.push({
            x: this.plane.x + Math.cos(angle) * 30,
            y: this.plane.y + Math.sin(angle) * 30,
            targetX: x,
            targetY: y,
            length: 0,
            maxLength: 50,
            angle: angle,
            alpha: 1,
            width: 2
        });
    }

    update() {
        if (!this.gameStarted || this.gamePaused) return;

        // Smoothly interpolate current wind to target
        this.wind.current.x += (this.wind.target.x - this.wind.current.x) * 0.1;
        this.wind.current.y += (this.wind.target.y - this.wind.current.y) * 0.1;

        // Update plane physics
        this.updatePlane();
        
        // Update wind particles
        this.updateWindParticles();

        // Add streamer updates
        this.updateWindStreamers();
    }

    updatePlane() {
        // Apply gravity
        this.plane.velocity.y += this.plane.gravity;

        // Apply wind force
        this.plane.velocity.x += this.wind.current.x;
        this.plane.velocity.y += this.wind.current.y;

        // Apply drag
        this.plane.velocity.x *= this.plane.drag;
        this.plane.velocity.y *= this.plane.drag;

        // Limit speed
        const speed = Math.sqrt(
            this.plane.velocity.x * this.plane.velocity.x + 
            this.plane.velocity.y * this.plane.velocity.y
        );
        if (speed > this.plane.maxSpeed) {
            const ratio = this.plane.maxSpeed / speed;
            this.plane.velocity.x *= ratio;
            this.plane.velocity.y *= ratio;
        }

        // Update position
        this.plane.x += this.plane.velocity.x;
        this.plane.y += this.plane.velocity.y;

        // Update rotation based on velocity
        this.plane.rotation = Math.atan2(this.plane.velocity.y, this.plane.velocity.x);

        // Keep plane in bounds
        this.keepPlaneInBounds();
    }

    updateWindParticles() {
        this.wind.particles = this.wind.particles.filter(particle => {
            particle.age++;
            return particle.age < particle.maxAge;
        });
    }

    updateWindStreamers() {
        this.wind.streamers = this.wind.streamers.filter(streamer => {
            streamer.length += 5;
            streamer.alpha -= 0.02;
            streamer.width *= 0.95;

            return streamer.alpha > 0 && streamer.width > 0.1;
        });
    }

    keepPlaneInBounds() {
        if (this.plane.x < 0) this.plane.x = 0;
        if (this.plane.x > this.canvas.width) this.plane.x = this.canvas.width;
        if (this.plane.y < 0) this.plane.y = 0;
        if (this.plane.y > this.canvas.height) this.plane.y = this.canvas.height;
    }

    draw() {
        // Clear canvas with background color instead of clear
        this.ctx.fillStyle = '#87CEEB';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw wind streamers (new wind effect)
        this.drawWindStreamers();
        
        // Draw existing wind particles
        this.drawWindParticles();

        // Draw plane
        this.drawPlane();

        // Draw wind indicator
        this.drawWindIndicator();
    }

    drawWindParticles() {
        this.ctx.save();
        this.wind.particles.forEach(particle => {
            const alpha = 1 - (particle.age / particle.maxAge);
            this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fill();
        });
        this.ctx.restore();
    }

    drawWindStreamers() {
        this.ctx.save();
        this.wind.streamers.forEach(streamer => {
            const gradient = this.ctx.createLinearGradient(
                streamer.x, 
                streamer.y,
                streamer.x + Math.cos(streamer.angle) * streamer.length,
                streamer.y + Math.sin(streamer.angle) * streamer.length
            );
            
            gradient.addColorStop(0, `rgba(255, 255, 255, ${streamer.alpha})`);
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

            this.ctx.beginPath();
            this.ctx.strokeStyle = gradient;
            this.ctx.lineWidth = streamer.width;
            this.ctx.moveTo(streamer.x, streamer.y);
            this.ctx.lineTo(
                streamer.x + Math.cos(streamer.angle) * streamer.length,
                streamer.y + Math.sin(streamer.angle) * streamer.length
            );
            this.ctx.stroke();
        });
        this.ctx.restore();
    }

    drawPlane() {
        this.ctx.save();
        this.ctx.translate(this.plane.x, this.plane.y);
        this.ctx.rotate(this.plane.rotation);
        
        // Draw paper plane with more contrast
        this.ctx.beginPath();
        this.ctx.moveTo(-15, 0);
        this.ctx.lineTo(15, 0);
        this.ctx.lineTo(0, -10);
        this.ctx.closePath();
        this.ctx.fillStyle = '#FFFFFF';  // Bright white
        this.ctx.fill();
        this.ctx.strokeStyle = '#000000';  // Black outline
        this.ctx.lineWidth = 2;  // Thicker outline
        this.ctx.stroke();
        
        this.ctx.restore();
    }

    drawWindIndicator() {
        const strength = Math.sqrt(
            this.wind.current.x * this.wind.current.x + 
            this.wind.current.y * this.wind.current.y
        );
        
        document.getElementById('wind-value').textContent = 
            Math.round(strength * 100);
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