class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        
        // Initialize boundaries first
        this.boundaries = {
            bottom: 0,  // Will be set in setupCanvas
            left: 0,
            right: 0,   // Will be set in setupCanvas
            groundSpeed: 8
        };
        
        // Set up responsive canvas size
        this.setupCanvas();
        
        this.ctx = this.canvas.getContext('2d');
        this.plane = {
            x: 100,
            y: 200,
            velocity: { x: 0, y: 0 },
            gravity: 0.2,
            width: 30,
            height: 20
        };
        this.wind = {
            x: 0,
            y: 0,
            strength: 0.5
        };
        
        // Add score and stars
        this.score = {
            current: 0,
            total: 300, // 100 points per star
            display: 0  // For score animation
        };
        this.stars = [
            { x: 300, y: 150, collected: false },
            { x: 500, y: 100, collected: false },
            { x: 700, y: 50, collected: false }
        ];
        
        // Animation time tracker
        this.time = 0;
        
        // Add event listeners
        this.setupControls();
        
        // Add goal properties
        this.goal = {
            x: 750,  // Slightly adjusted from 800 to be visible
            y: 250,
            radius: 30,
            baseGlow: 20,
            currentGlow: 20,
            completed: false
        };
        
        // Add game state and UI properties
        this.gameState = 'intro'; // 'intro', 'playing', 'completed', or 'gameOver'
        this.showInstructions = true;
        this.instructionsFadeOut = 0;
        
        // Add crash state and animation properties
        this.crash = {
            active: false,
            particles: [],
            startTime: 0
        };
        
        // Add instruction fade duration
        this.instructionDuration = 3000; // 3 seconds
        this.instructionStartTime = Date.now();
        
        // Add level management
        this.currentLevel = 1;
        this.maxLevels = 30;
        this.levelTransitioning = false;
        this.transitionAlpha = 0;
        
        // Add wind effect zones
        this.windZones = [];
        
        // Enhanced wind particle system
        this.windParticles = [];
        this.windEffects = {
            particles: [],
            maxParticles: 100,
            trailLength: 5
        };
        
        // Add time tracking
        this.levelTime = 0;
        this.totalTime = 0;
        this.timeLimit = null; // Will be set per level
        
        // Initialize first level
        this.initLevel(this.currentLevel);
        
        // Start the game loop
        this.gameLoop();
        
        // Add restart handling
        this.restartButton = {
            x: this.canvas.width/2 - 60,
            y: this.canvas.height/2 + 80,
            width: 120,
            height: 40
        };
        
        // Add click handler for restart button
        this.canvas.addEventListener('click', this.handleClick.bind(this));
        
        // Add touch handling
        this.touchStartPos = null;
        this.setupMobileControls();
        
        // Add window resize handler
        window.addEventListener('resize', this.handleResize.bind(this));
    }

    setupCanvas() {
        // 16:9 aspect ratio dimensions
        const baseWidth = 1280;  // Standard 16:9 width
        const baseHeight = 720;  // Standard 16:9 height
        
        // Get current viewport size
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Calculate scale factor maintaining 16:9
        const scale = Math.min(
            viewportWidth / baseWidth,
            viewportHeight / baseHeight
        );
        
        // Set canvas size
        this.canvas.width = baseWidth;
        this.canvas.height = baseHeight;
        
        // Set canvas style size for scaling
        this.canvas.style.width = `${baseWidth * scale}px`;
        this.canvas.style.height = `${baseHeight * scale}px`;
        
        // Store scale factor for input calculations
        this.scale = scale;
        
        // Update ground level and other position-dependent values
        this.boundaries.bottom = baseHeight - 50; // Ground level
        this.boundaries.right = baseWidth;
    }

    handleResize() {
        this.setupCanvas();
    }

    setupMobileControls() {
        // Touch start handler
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.touchStartPos = this.getScaledPosition(touch);
        });

        // Touch move handler
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (this.touchStartPos && this.gameState === 'playing') {
                const touch = e.touches[0];
                const currentPos = this.getScaledPosition(touch);
                
                // Calculate wind based on touch movement
                const dx = currentPos.x - this.touchStartPos.x;
                const dy = currentPos.y - this.touchStartPos.y;
                
                // Update wind strength based on touch movement
                this.wind.x = (dx / 50) * this.wind.strength;
                this.wind.y = (dy / 50) * this.wind.strength;
            }
        });

        // Touch end handler
        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.wind.x = 0;
            this.wind.y = 0;
            this.touchStartPos = null;
        });

        // Touch cancel handler
        this.canvas.addEventListener('touchcancel', (e) => {
            e.preventDefault();
            this.wind.x = 0;
            this.wind.y = 0;
            this.touchStartPos = null;
        });
    }

    getScaledPosition(touch) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: (touch.clientX - rect.left) / this.scale,
            y: (touch.clientY - rect.top) / this.scale
        };
    }

    handleClick(e) {
        // Update click handler for scaled canvas
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        const clickX = (e.clientX - rect.left) * scaleX;
        const clickY = (e.clientY - rect.top) * scaleY;

        if (this.gameState === 'gameOver' || 
            (this.gameState === 'completed' && this.currentLevel === this.maxLevels)) {
            // Check if click is within restart button bounds
            if (clickX >= this.restartButton.x && 
                clickX <= this.restartButton.x + this.restartButton.width &&
                clickY >= this.restartButton.y && 
                clickY <= this.restartButton.y + this.restartButton.height) {
                this.restart();
            }
        } else if (this.gameState === 'playing') {
            // Existing click handling for wind gust
            const dx = clickX - this.plane.x;
            const dy = clickY - this.plane.y;
            const length = Math.sqrt(dx * dx + dy * dy);
            
            this.plane.velocity.x += (dx / length) * 5;
            this.plane.velocity.y += (dy / length) * 5;
        }
    }

    setupControls() {
        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            switch(e.key) {
                case 'ArrowLeft':
                    this.wind.x = -this.wind.strength;
                    break;
                case 'ArrowRight':
                    this.wind.x = this.wind.strength;
                    break;
                case 'ArrowUp':
                    this.wind.y = -this.wind.strength;
                    break;
                case 'ArrowDown':
                    this.wind.y = this.wind.strength;
                    break;
            }
        });

        document.addEventListener('keyup', (e) => {
            switch(e.key) {
                case 'ArrowLeft':
                case 'ArrowRight':
                    this.wind.x = 0;
                    break;
                case 'ArrowUp':
                case 'ArrowDown':
                    this.wind.y = 0;
                    break;
            }
        });

        // Mouse click controls
        this.canvas.addEventListener('click', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const clickY = e.clientY - rect.top;
            
            // Calculate direction vector from plane to click
            const dx = clickX - this.plane.x;
            const dy = clickY - this.plane.y;
            const length = Math.sqrt(dx * dx + dy * dy);
            
            // Apply normalized impulse
            this.plane.velocity.x += (dx / length) * 5;
            this.plane.velocity.y += (dy / length) * 5;
        });
    }

    update() {
        if (this.gameState === 'intro') {
            // Start game on any key press
            document.addEventListener('keydown', this.startGame, { once: true });
            document.addEventListener('click', this.startGame, { once: true });
            return;
        }
        
        if (this.gameState === 'completed' || this.gameState === 'gameOver') {
            // Only update particles if game is over
            if (this.crash.active) {
                this.updateCrashParticles();
            }
            return;
        }

        // Remove the early game over check and let checkCrash handle it
        // Update animation time
        this.time += 0.05;
        
        // Update stars' vertical positions for bobbing effect
        this.stars.forEach(star => {
            if (!star.collected) {
                // Add a bobbing offset using sine wave
                star.currentY = star.y + Math.sin(this.time) * 10;
            }
        });

        // Check for collisions with stars
        this.checkStarCollisions();
        
        // Apply wind forces
        this.plane.velocity.x += this.wind.x;
        this.plane.velocity.y += this.wind.y;
        
        // Apply gravity
        this.plane.velocity.y += this.plane.gravity;
        
        // Apply air resistance
        this.plane.velocity.x *= 0.98;
        this.plane.velocity.y *= 0.98;
        
        // Check for obstacle collisions
        if (this.checkObstacleCollisions()) {
            this.initiateCrash();
            return;
        }

        // Check for crashes before updating position
        if (this.checkCrash()) {
            return;
        }

        // Update position
        this.plane.x += this.plane.velocity.x;
        this.plane.y += this.plane.velocity.y;

        // Keep plane in bounds or crash if moving too fast
        if (this.plane.x < this.boundaries.left || this.plane.x > this.boundaries.right) {
            if (Math.abs(this.plane.velocity.x) > this.boundaries.groundSpeed) {
                this.initiateCrash();
                return;
            }
            // Bounce off walls if moving slowly
            this.plane.x = Math.max(this.boundaries.left, Math.min(this.plane.x, this.boundaries.right));
            this.plane.velocity.x *= -0.5;
        }

        // Ground collision check
        if (this.plane.y >= this.boundaries.bottom) {
            if (Math.abs(this.plane.velocity.y) > this.boundaries.groundSpeed) {
                this.initiateCrash();
                return;
            }
            // Safe landing
            this.plane.y = this.boundaries.bottom;
            this.plane.velocity.y = 0;
        }

        // Update goal animation with safety check
        if (this.gameState === 'playing') {
            const glowOffset = Math.sin(this.time) * 10;
            this.goal.currentGlow = Math.max(0, this.goal.baseGlow + glowOffset);
        }
        
        // Check for goal collision
        const dx = (this.plane.x + this.plane.width/2) - this.goal.x;
        const dy = (this.plane.y + this.plane.height/2) - this.goal.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < this.goal.radius + 20) {
            this.gameState = 'completed';
            this.goal.completed = true;
        }

        // Update instruction fade
        if (this.showInstructions && this.gameState === 'playing') {
            const elapsed = Date.now() - this.instructionStartTime;
            this.instructionsFadeOut = Math.min(1, elapsed / this.instructionDuration);
            if (this.instructionsFadeOut >= 1) {
                this.showInstructions = false;
            }
        }

        // Animate score display
        if (this.score.display < this.score.current) {
            this.score.display = Math.min(
                this.score.display + 5,
                this.score.current
            );
        }

        // Handle level completion
        if (this.gameState === 'completed' && !this.levelTransitioning) {
            this.startNextLevel();
        }

        // Update wind particles and obstacles
        this.updateWindParticles();
        this.updateObstacles();

        // Apply wind zone forces
        this.windZones.forEach(zone => {
            if (this.isInWindZone(zone)) {
                this.plane.velocity.x += zone.force.x * 0.1;
                this.plane.velocity.y += zone.force.y * 0.1;
            }
        });

        // Update wind effects
        this.updateWindEffects();

        // Update level time
        this.levelTime += 1/60; // Assuming 60 FPS
        
        // Check time limit
        if (this.timeLimit && this.levelTime >= this.timeLimit) {
            this.gameState = 'gameOver';
            return;
        }
        
        // Update oscillating wind zones
        this.windZones.forEach(zone => {
            if (zone.oscillating) {
                const angle = this.time * zone.frequency;
                zone.force.x = Math.cos(angle) * zone.force.x;
                zone.force.y = Math.sin(angle) * zone.force.y;
            }
        });
    }

    startGame = () => {
        this.gameState = 'playing';
        this.instructionStartTime = Date.now(); // Reset instruction timer when game starts
    }

    checkStarCollisions() {
        this.stars.forEach(star => {
            if (!star.collected) {
                const dx = (this.plane.x + this.plane.width/2) - star.x;
                const dy = (this.plane.y + this.plane.height/2) - star.currentY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < 25) {
                    star.collected = true;
                    this.score.current += 100;
                }
            }
        });
    }

    drawStars() {
        this.stars.forEach(star => {
            if (!star.collected) {
                // Draw star
                this.ctx.save();
                this.ctx.translate(star.x, star.currentY);
                
                // Create star shape
                this.ctx.beginPath();
                for (let i = 0; i < 5; i++) {
                    const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
                    const radius = i === 0 ? 10 : 4;
                    const x = Math.cos(angle) * radius;
                    const y = Math.sin(angle) * radius;
                    
                    if (i === 0) {
                        this.ctx.moveTo(x, y);
                    } else {
                        this.ctx.lineTo(x, y);
                    }
                }
                this.ctx.closePath();
                
                // Fill and stroke star
                this.ctx.fillStyle = 'gold';
                this.ctx.fill();
                this.ctx.strokeStyle = '#DAA520';
                this.ctx.stroke();
                
                this.ctx.restore();
            }
        });
    }

    drawScore() {
        // Progress bar background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.fillRect(20, 20, 200, 30);
        
        // Progress bar fill
        const progress = (this.score.display / this.score.total) * 200;
        this.ctx.fillStyle = 'gold';
        this.ctx.fillRect(20, 20, progress, 30);
        
        // Score text
        this.ctx.font = 'bold 20px Arial';
        this.ctx.fillStyle = 'white';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`Score: ${this.score.display}/${this.score.total}`, 
            30, 42
        );
    }

    drawWindIndicator() {
        const centerX = this.canvas.width / 2;
        const centerY = 50;
        const radius = 30;
        
        // Draw circle background
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.fill();
        
        // Draw wind direction arrow
        if (this.wind.x !== 0 || this.wind.y !== 0) {
            const arrowLength = radius * 0.8;
            const windAngle = Math.atan2(this.wind.y, this.wind.x);
            
            this.ctx.beginPath();
            this.ctx.moveTo(centerX, centerY);
            this.ctx.lineTo(
                centerX + Math.cos(windAngle) * arrowLength,
                centerY + Math.sin(windAngle) * arrowLength
            );
            this.ctx.strokeStyle = '#333';
            this.ctx.lineWidth = 3;
            this.ctx.stroke();
            
            // Draw arrow head
            this.ctx.beginPath();
            this.ctx.moveTo(
                centerX + Math.cos(windAngle) * arrowLength,
                centerY + Math.sin(windAngle) * arrowLength
            );
            this.ctx.lineTo(
                centerX + Math.cos(windAngle + 0.5) * (arrowLength - 10),
                centerY + Math.sin(windAngle + 0.5) * (arrowLength - 10)
            );
            this.ctx.lineTo(
                centerX + Math.cos(windAngle - 0.5) * (arrowLength - 10),
                centerY + Math.sin(windAngle - 0.5) * (arrowLength - 10)
            );
            this.ctx.closePath();
            this.ctx.fillStyle = '#333';
            this.ctx.fill();
        }
    }

    drawGoal() {
        this.ctx.save();
        
        // Ensure currentGlow is a finite number
        const glowRadius = this.goal.currentGlow || this.goal.baseGlow;
        
        // Draw outer glow
        const gradient = this.ctx.createRadialGradient(
            this.goal.x, this.goal.y, 0,
            this.goal.x, this.goal.y, this.goal.radius + Math.max(0, glowRadius)
        );
        
        gradient.addColorStop(0, 'rgba(255, 215, 0, 0.8)');    // Gold center
        gradient.addColorStop(0.5, 'rgba(255, 215, 0, 0.3)');  // Fading gold
        gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');      // Transparent edge
        
        this.ctx.beginPath();
        this.ctx.arc(
            this.goal.x, 
            this.goal.y, 
            this.goal.radius + Math.max(0, glowRadius),
            0, 
            Math.PI * 2
        );
        this.ctx.fillStyle = gradient;
        this.ctx.fill();
        
        // Draw inner circle
        this.ctx.beginPath();
        this.ctx.arc(this.goal.x, this.goal.y, this.goal.radius, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(255, 215, 0, 0.5)';
        this.ctx.fill();
        this.ctx.strokeStyle = 'gold';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        
        // Draw checkered pattern inside if not completed
        if (!this.goal.completed) {
            this.ctx.save();
            this.ctx.clip(); // Clip to the circle
            
            const squareSize = 10;
            for (let i = -this.goal.radius; i < this.goal.radius; i += squareSize) {
                for (let j = -this.goal.radius; j < this.goal.radius; j += squareSize) {
                    if ((i + j) % (squareSize * 2) === 0) {
                        this.ctx.fillStyle = 'rgba(255, 215, 0, 0.8)';
                        this.ctx.fillRect(
                            this.goal.x + i,
                            this.goal.y + j,
                            squareSize,
                            squareSize
                        );
                    }
                }
            }
            this.ctx.restore();
        }
        
        this.ctx.restore();
    }

    drawLevelComplete() {
        if (this.gameState === 'completed') {
            // Create semi-transparent overlay
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Draw completion message
            this.ctx.font = 'bold 48px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            
            // Draw text shadow
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            this.ctx.fillText('Level Complete!', 
                this.canvas.width/2 + 2, 
                this.canvas.height/2 + 2
            );
            
            // Draw main text
            this.ctx.fillStyle = 'gold';
            this.ctx.fillText('Level Complete!', 
                this.canvas.width/2, 
                this.canvas.height/2
            );
            
            // Draw score
            this.ctx.font = 'bold 24px Arial';
            this.ctx.fillStyle = 'white';
            this.ctx.fillText(`Final Score: ${this.score.display}`, 
                this.canvas.width/2, 
                this.canvas.height/2 + 50
            );
        }
    }

    drawInstructions() {
        if (this.gameState === 'intro') {
            // Full opacity intro screen
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            
            // Title
            this.ctx.font = 'bold 48px Arial';
            this.ctx.fillStyle = 'white';
            this.ctx.fillText('Paper Plane Adventure', 
                this.canvas.width/2, 
                this.canvas.height/2 - 80
            );
            
            // Instructions
            this.ctx.font = '24px Arial';
            const instructions = [
                window.innerWidth > 800 ? 
                    'Use arrow keys to control the wind' :
                    'Swipe to control the wind',
                window.innerWidth > 800 ?
                    'Click anywhere to create a wind gust' :
                    'Tap anywhere to create a wind gust',
                'Collect all stars and reach the goal!',
                '',
                window.innerWidth > 800 ?
                    'Press any key or click to start' :
                    'Tap to start'
            ];
            
            instructions.forEach((text, i) => {
                this.ctx.fillText(text, 
                    this.canvas.width/2, 
                    this.canvas.height/2 - 20 + (i * 30)
                );
            });
        } else if (this.showInstructions) {
            // Fade out in-game instructions
            const alpha = Math.max(0, 1 - this.instructionsFadeOut);
            this.ctx.fillStyle = `rgba(0, 0, 0, ${alpha * 0.7})`;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.ctx.font = '24px Arial';
            this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            this.ctx.textAlign = 'center';
            this.ctx.fillText('Use arrow keys or click to control the wind', 
                this.canvas.width/2, 
                this.canvas.height/2
            );
        }
    }

    drawGameOver() {
        if (this.gameState === 'gameOver') {
            // Create semi-transparent overlay
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.ctx.font = 'bold 48px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            
            // Game Over text with shake effect
            const shakeAmount = 3;
            const offsetX = Math.random() * shakeAmount - shakeAmount/2;
            const offsetY = Math.random() * shakeAmount - shakeAmount/2;
            
            // Text shadow
            this.ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
            this.ctx.fillText('CRASH!', 
                this.canvas.width/2 + offsetX + 2, 
                this.canvas.height/2 + offsetY - 30 + 2
            );
            
            // Main text
            this.ctx.fillStyle = 'red';
            this.ctx.fillText('CRASH!', 
                this.canvas.width/2 + offsetX, 
                this.canvas.height/2 + offsetY - 30
            );
            
            // Score and restart instruction
            this.ctx.font = '24px Arial';
            this.ctx.fillStyle = 'white';
            this.ctx.fillText(`Final Score: ${this.score.display}`, 
                this.canvas.width/2, 
                this.canvas.height/2 + 20
            );
            
            // Draw Play Again button
            this.ctx.fillStyle = 'rgba(0, 100, 255, 0.8)';
            this.ctx.fillRect(
                this.restartButton.x,
                this.restartButton.y,
                this.restartButton.width,
                this.restartButton.height
            );
            
            // Button text
            this.ctx.font = 'bold 20px Arial';
            this.ctx.fillStyle = 'white';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('Play Again', 
                this.restartButton.x + this.restartButton.width/2,
                this.restartButton.y + this.restartButton.height/2
            );
            
            // Add time limit failure message if applicable
            if (this.timeLimit && this.levelTime >= this.timeLimit) {
                this.ctx.fillStyle = 'red';
                this.ctx.font = '32px Arial';
                this.ctx.fillText('Time\'s Up!', 
                    this.canvas.width/2, 
                    this.canvas.height/2 - 80
                );
            }
        }
    }

    draw() {
        // Clear the canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw sky
        this.ctx.fillStyle = 'lightblue';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw ground - Update position for 16:9 (720p) canvas
        this.ctx.fillStyle = 'green';
        this.ctx.fillRect(0, this.canvas.height - 50, this.canvas.width, 50);

        // Draw stars
        this.drawStars();
        
        // Draw wind indicator
        this.drawWindIndicator();

        // Draw UI elements
        this.drawScore();
        this.drawInstructions();
        this.drawGameOver();

        // Draw goal
        this.drawGoal();
        
        // Draw plane
        this.ctx.save();
        this.ctx.translate(this.plane.x, this.plane.y);
        
        // Rotate plane based on velocity
        const angle = Math.atan2(this.plane.velocity.y, this.plane.velocity.x);
        this.ctx.rotate(angle);
        
        // Draw plane shape
        this.ctx.beginPath();
        this.ctx.moveTo(0, 0);
        this.ctx.lineTo(30, 10);
        this.ctx.lineTo(0, 20);
        this.ctx.lineTo(5, 10);
        this.ctx.closePath();
        
        this.ctx.fillStyle = 'white';
        this.ctx.fill();
        this.ctx.strokeStyle = '#333';
        this.ctx.stroke();
        
        this.ctx.restore();

        // Draw level complete overlay
        this.drawLevelComplete();

        // Draw crash effect
        this.drawCrashEffect();

        // Draw obstacles
        this.drawObstacles();

        // Draw level transition
        if (this.levelTransitioning) {
            this.ctx.fillStyle = `rgba(0, 0, 0, ${this.transitionAlpha})`;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            if (this.transitionAlpha >= 0.5) {
                this.ctx.font = 'bold 48px Arial';
                this.ctx.fillStyle = 'white';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(`Level ${this.currentLevel}`, 
                    this.canvas.width/2, 
                    this.canvas.height/2
                );
            }
        }

        // Draw wind zones before obstacles
        this.drawWindZones();

        // Draw wind effects before plane
        this.drawWindEffects();

        // Draw timer if level has time limit
        this.drawTimer();
        
        // Draw game complete screen
        this.drawGameComplete();
    }

    gameLoop = () => {
        this.update();
        this.draw();
        requestAnimationFrame(this.gameLoop);
    }

    checkCrash() {
        // Check for high-speed collisions
        if (this.plane.y >= this.boundaries.bottom && Math.abs(this.plane.velocity.y) > this.boundaries.groundSpeed) {
            this.initiateCrash();
            return true;
        }
        
        // Check for wall crashes at high speed
        if ((this.plane.x <= this.boundaries.left || this.plane.x >= this.boundaries.right) && 
            Math.abs(this.plane.velocity.x) > this.boundaries.groundSpeed) {
            this.initiateCrash();
            return true;
        }
        
        return false;
    }

    initiateCrash() {
        if (!this.crash.active) {
            this.crash.active = true;
            this.crash.startTime = this.time;
            this.gameState = 'gameOver';
            
            // Create more particles for a better effect
            for (let i = 0; i < 30; i++) {
                this.crash.particles.push({
                    x: this.plane.x,
                    y: this.plane.y,
                    vx: (Math.random() - 0.5) * 15,  // Increased spread
                    vy: (Math.random() - 0.5) * 15,
                    size: Math.random() * 8 + 3,     // Larger particles
                    color: Math.random() > 0.5 ? 'white' : '#333'
                });
            }
        }
    }

    updateCrashParticles() {
        if (this.crash.active) {
            this.crash.particles.forEach(particle => {
                particle.x += particle.vx;
                particle.y += particle.vy;
                particle.vy += 0.5; // Gravity
                particle.size *= 0.95; // Shrink
            });
            
            // Remove tiny particles
            this.crash.particles = this.crash.particles.filter(p => p.size > 0.5);
        }
    }

    drawCrashEffect() {
        if (this.crash.active) {
            this.crash.particles.forEach(particle => {
                this.ctx.beginPath();
                this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                this.ctx.fillStyle = particle.color;
                this.ctx.fill();
            });
        }
    }

    initLevel(levelNumber) {
        // Reset basic properties
        this.plane = {
            x: 100,
            y: 200,
            velocity: { x: 0, y: 0 },
            gravity: 0.2,
            width: 30,
            height: 20
        };
        
        this.wind = { x: 0, y: 0, strength: 0.5 };
        this.crash = { active: false, particles: [], startTime: 0 };
        
        // Generate level configuration
        const levelConfig = this.generateLevel(levelNumber);
        
        // Set up level components
        this.stars = levelConfig.stars.map(star => ({
            ...star,
            collected: false,
            currentY: star.y
        }));
        
        this.goal = levelConfig.goal;
        this.obstacles = levelConfig.obstacles;
        this.windZones = levelConfig.windZones;
        this.wind.strength = levelConfig.windStrength;
        this.timeLimit = levelConfig.timeLimit;
        
        // Reset score for this level
        this.score = {
            current: 0,
            total: this.stars.length * 100,
            display: 0
        };
        
        // Initialize wind particles
        this.initWindParticles();
    }

    startNextLevel() {
        if (this.currentLevel < this.maxLevels) {
            this.levelTransitioning = true;
            this.transitionAlpha = 0;
            
            // Start transition animation
            const transition = () => {
                this.transitionAlpha += 0.02;
                if (this.transitionAlpha >= 1) {
                    // Initialize next level
                    this.currentLevel++;
                    this.initLevel(this.currentLevel);
                    
                    // Start fade out
                    const fadeOut = () => {
                        this.transitionAlpha -= 0.02;
                        if (this.transitionAlpha <= 0) {
                            this.levelTransitioning = false;
                            this.gameState = 'playing';
                        } else {
                            requestAnimationFrame(fadeOut);
                        }
                    };
                    fadeOut();
                } else {
                    requestAnimationFrame(transition);
                }
            };
            transition();
        }
    }

    drawObstacles() {
        this.obstacles.forEach(obstacle => {
            if (obstacle.type === 'windmill') {
                this.ctx.save();
                this.ctx.translate(obstacle.x, obstacle.y);
                
                // Draw windmill turbulence effect
                this.drawWindmillTurbulence(obstacle);
                
                // Update rotation
                obstacle.rotation = (obstacle.rotation || 0) + obstacle.speed;
                this.ctx.rotate(obstacle.rotation);
                
                // Draw center
                this.ctx.beginPath();
                this.ctx.arc(0, 0, 10, 0, Math.PI * 2);
                this.ctx.fillStyle = '#666';
                this.ctx.fill();
                
                // Draw blades
                for (let i = 0; i < 3; i++) {
                    this.ctx.save();
                    this.ctx.rotate((i * Math.PI * 2) / 3);
                    
                    // Draw blade
                    this.ctx.beginPath();
                    this.ctx.moveTo(-5, 0);
                    this.ctx.lineTo(5, 0);
                    this.ctx.lineTo(2, -obstacle.radius);
                    this.ctx.lineTo(-2, -obstacle.radius);
                    this.ctx.closePath();
                    
                    this.ctx.fillStyle = '#999';
                    this.ctx.fill();
                    this.ctx.strokeStyle = '#666';
                    this.ctx.stroke();
                    
                    this.ctx.restore();
                }
                
                this.ctx.restore();
            } else if (obstacle.type === 'balloon') {
                this.ctx.save();
                this.ctx.translate(obstacle.x, obstacle.y);

                // Draw balloon
                this.ctx.beginPath();
                this.ctx.arc(0, 0, obstacle.radius, 0, Math.PI * 2);
                this.ctx.fillStyle = '#FF6B6B';
                this.ctx.fill();
                this.ctx.strokeStyle = '#FF4949';
                this.ctx.stroke();

                // Draw basket
                this.ctx.beginPath();
                this.ctx.moveTo(-10, obstacle.radius);
                this.ctx.lineTo(10, obstacle.radius);
                this.ctx.lineTo(5, obstacle.radius + 15);
                this.ctx.lineTo(-5, obstacle.radius + 15);
                this.ctx.closePath();
                this.ctx.fillStyle = '#8B4513';
                this.ctx.fill();

                this.ctx.restore();
            }
        });
    }

    drawWindmillTurbulence(windmill) {
        // Create circular turbulence area
        const turbulenceRadius = windmill.radius * 1.5;
        
        // Create radial gradient for turbulence
        const gradient = this.ctx.createRadialGradient(
            0, 0, windmill.radius * 0.5,
            0, 0, turbulenceRadius
        );
        
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
        gradient.addColorStop(0.5, 'rgba(200, 200, 255, 0.1)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        // Draw base turbulence area
        this.ctx.beginPath();
        this.ctx.arc(0, 0, turbulenceRadius, 0, Math.PI * 2);
        this.ctx.fillStyle = gradient;
        this.ctx.fill();

        // Draw swirling wind lines
        const numLines = 12;
        const time = Date.now() / 1000;
        
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        this.ctx.lineWidth = 2;
        
        for (let i = 0; i < numLines; i++) {
            const angle = (i / numLines) * Math.PI * 2 + time * windmill.speed * 2;
            const spiralTightness = 0.3;
            
            this.ctx.beginPath();
            
            // Create spiral effect
            for (let r = windmill.radius * 0.5; r < turbulenceRadius; r += 5) {
                const spiralAngle = angle + r * spiralTightness;
                const x = Math.cos(spiralAngle) * r;
                const y = Math.sin(spiralAngle) * r;
                
                if (r === windmill.radius * 0.5) {
                    this.ctx.moveTo(x, y);
                } else {
                    this.ctx.lineTo(x, y);
                }
            }
            
            this.ctx.stroke();
        }
    }

    updateObstacles() {
        this.obstacles.forEach(obstacle => {
            if (obstacle.type === 'windmill') {
                // Update rotation
                obstacle.rotation = (obstacle.rotation || 0) + obstacle.speed;
                
                // Apply wind effect to nearby plane
                const dx = this.plane.x - obstacle.x;
                const dy = this.plane.y - obstacle.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const turbulenceRadius = obstacle.radius * 1.5;
                
                if (distance < turbulenceRadius) {
                    // Calculate wind force based on distance and rotation speed
                    const force = (1 - distance / turbulenceRadius) * obstacle.speed * 15;
                    const angle = obstacle.rotation + Math.PI / 2; // Perpendicular to blades
                    
                    // Apply turbulent force to plane
                    this.plane.velocity.x += Math.cos(angle) * force;
                    this.plane.velocity.y += Math.sin(angle) * force;
                    
                    // Add some random turbulence
                    this.plane.velocity.x += (Math.random() - 0.5) * force * 0.5;
                    this.plane.velocity.y += (Math.random() - 0.5) * force * 0.5;
                }
            } else if (obstacle.type === 'balloon') {
                // Update balloon position
                obstacle.phase += obstacle.frequency;
                obstacle.y = obstacle.y + 
                    Math.sin(obstacle.phase) * obstacle.amplitude * 0.01;
            }
        });
    }

    checkObstacleCollisions() {
        return this.obstacles.some(obstacle => {
            if (obstacle.type === 'windmill') {
                // Check collision with windmill blades
                const dx = this.plane.x - obstacle.x;
                const dy = this.plane.y - obstacle.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < obstacle.radius) {
                    // Calculate angle relative to windmill rotation
                    const angle = (Math.atan2(dy, dx) - obstacle.rotation) % (Math.PI * 2);
                    const bladeAngles = [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3];
                    
                    // Check if angle aligns with any blade
                    return bladeAngles.some(bladeAngle => {
                        const angleDiff = Math.abs(angle - bladeAngle) % (Math.PI * 2);
                        return angleDiff < 0.2 || angleDiff > Math.PI * 2 - 0.2;
                    });
                }
            } else if (obstacle.type === 'balloon') {
                // Check collision with balloon
                const planeCenter = {
                    x: this.plane.x + this.plane.width/2,
                    y: this.plane.y + this.plane.height/2
                };
                
                const dx = planeCenter.x - obstacle.x;
                const dy = planeCenter.y - obstacle.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                // Check if plane is within balloon radius plus some margin
                if (distance < obstacle.radius + 15) {
                    return true;
                }
                
                // Check for collision with balloon's basket
                const basketTop = obstacle.y + obstacle.radius;
                const basketBottom = basketTop + 15;
                const basketLeft = obstacle.x - 10;
                const basketRight = obstacle.x + 10;
                
                return planeCenter.x >= basketLeft && 
                       planeCenter.x <= basketRight && 
                       planeCenter.y >= basketTop && 
                       planeCenter.y <= basketBottom;
            }
            return false;
        });
    }

    initWindParticles() {
        this.windParticles = [];
        this.windZones.forEach(zone => {
            for (let i = 0; i < 50; i++) {
                this.windParticles.push({
                    x: zone.x + Math.random() * zone.width,
                    y: zone.y + Math.random() * zone.height,
                    size: Math.random() * 2 + 1,
                    speed: Math.random() * 2 + 2,
                    zone: zone
                });
            }
        });
    }

    updateWindParticles() {
        this.windParticles.forEach(particle => {
            // Move particle according to wind zone force
            particle.x += particle.zone.force.x * particle.speed * 0.1;
            particle.y += particle.zone.force.y * particle.speed * 0.1;

            // Reset particle position if it leaves its zone
            if (particle.x < particle.zone.x || 
                particle.x > particle.zone.x + particle.zone.width ||
                particle.y < particle.zone.y || 
                particle.y > particle.zone.y + particle.zone.height) {
                // Reset to random position on the opposite side
                if (particle.zone.force.x > 0) {
                    particle.x = particle.zone.x;
                } else if (particle.zone.force.x < 0) {
                    particle.x = particle.zone.x + particle.zone.width;
                }
                if (particle.zone.force.y > 0) {
                    particle.y = particle.zone.y;
                } else if (particle.zone.force.y < 0) {
                    particle.y = particle.zone.y + particle.zone.height;
                }
            }
        });
    }

    drawWindZones() {
        this.windZones.forEach(zone => {
            if (zone.visible) {
                // Create gradient for wind zone
                const gradient = this.ctx.createLinearGradient(
                    zone.x, zone.y,
                    zone.x + zone.force.x * 100,
                    zone.y + zone.force.y * 100
                );
                
                gradient.addColorStop(0, 'rgba(135, 206, 235, 0.1)');
                gradient.addColorStop(0.5, 'rgba(135, 206, 235, 0.2)');
                gradient.addColorStop(1, 'rgba(135, 206, 235, 0.1)');
                
                // Draw zone with gradient
                this.ctx.fillStyle = gradient;
                this.ctx.fillRect(zone.x, zone.y, zone.width, zone.height);
                
                // Draw flowing lines to indicate wind direction
                this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                this.ctx.lineWidth = 1;
                
                const spacing = 30;
                const time = Date.now() / 1000;
                
                for (let x = zone.x; x < zone.x + zone.width; x += spacing) {
                    for (let y = zone.y; y < zone.y + zone.height; y += spacing) {
                        const offset = Math.sin(time + x/50 + y/50) * 5;
                        
                        this.ctx.beginPath();
                        this.ctx.moveTo(x + offset, y);
                        this.ctx.lineTo(
                            x + zone.force.x * 20 + offset,
                            y + zone.force.y * 20
                        );
                        this.ctx.stroke();
                    }
                }
            }
        });
    }

    updateWindEffects() {
        // Create new wind effect particles
        if (this.wind.x !== 0 || this.wind.y !== 0) {
            while (this.windEffects.particles.length < this.windEffects.maxParticles) {
                this.windEffects.particles.push({
                    x: Math.random() * this.canvas.width,
                    y: Math.random() * this.canvas.height,
                    size: Math.random() * 2 + 1,
                    speed: Math.random() * 2 + 3,
                    trail: [],
                    alpha: Math.random() * 0.5 + 0.5
                });
            }
        }

        // Update existing particles
        this.windEffects.particles.forEach(particle => {
            // Add current position to trail
            particle.trail.unshift({ x: particle.x, y: particle.y });
            
            // Limit trail length
            if (particle.trail.length > this.windEffects.trailLength) {
                particle.trail.pop();
            }
            
            // Move particle
            particle.x += this.wind.x * particle.speed;
            particle.y += this.wind.y * particle.speed;
            
            // Wrap around screen
            if (particle.x < 0) particle.x = this.canvas.width;
            if (particle.x > this.canvas.width) particle.x = 0;
            if (particle.y < 0) particle.y = this.canvas.height;
            if (particle.y > this.canvas.height) particle.y = 0;
        });

        // Remove particles when wind stops
        if (this.wind.x === 0 && this.wind.y === 0) {
            this.windEffects.particles = this.windEffects.particles.slice(0, 20);
        }
    }

    drawWindEffects() {
        this.ctx.save();
        
        this.windEffects.particles.forEach(particle => {
            if (particle.trail.length > 1) {
                // Draw particle trail
                this.ctx.beginPath();
                this.ctx.moveTo(particle.trail[0].x, particle.trail[0].y);
                
                for (let i = 1; i < particle.trail.length; i++) {
                    this.ctx.lineTo(particle.trail[i].x, particle.trail[i].y);
                }
                
                this.ctx.strokeStyle = `rgba(255, 255, 255, ${particle.alpha * 0.3})`;
                this.ctx.lineWidth = particle.size / 2;
                this.ctx.stroke();
                
                // Draw particle
                this.ctx.beginPath();
                this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                this.ctx.fillStyle = `rgba(255, 255, 255, ${particle.alpha})`;
                this.ctx.fill();
            }
        });
        
        this.ctx.restore();
    }

    isInWindZone(zone) {
        return this.plane.x >= zone.x && 
               this.plane.x <= zone.x + zone.width &&
               this.plane.y >= zone.y && 
               this.plane.y <= zone.y + zone.height;
    }

    drawTimer() {
        if (this.timeLimit) {
            const timeLeft = Math.max(0, this.timeLimit - this.levelTime);
            const isLow = timeLeft < 10;
            
            // Draw timer background
            this.ctx.fillStyle = isLow ? 'rgba(255, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.3)';
            this.ctx.fillRect(this.canvas.width - 120, 20, 100, 30);
            
            // Draw timer text
            this.ctx.font = 'bold 20px Arial';
            this.ctx.fillStyle = isLow ? 'red' : 'white';
            this.ctx.textAlign = 'right';
            this.ctx.fillText(`Time: ${timeLeft.toFixed(1)}`, 
                this.canvas.width - 30, 42
            );
        }
    }

    drawGameComplete() {
        if (this.gameState === 'completed' && this.currentLevel === this.maxLevels) {
            // Overlay
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Title
            this.ctx.font = 'bold 48px Arial';
            this.ctx.fillStyle = 'gold';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('Congratulations!', 
                this.canvas.width/2, 
                this.canvas.height/2 - 100
            );
            
            // Stats
            this.ctx.font = '24px Arial';
            this.ctx.fillStyle = 'white';
            const stats = [
                `Total Score: ${this.score.display}`,
                `Time: ${this.totalTime.toFixed(1)} seconds`,
                'All Levels Completed!'
            ];
            
            stats.forEach((text, i) => {
                this.ctx.fillText(text, 
                    this.canvas.width/2, 
                    this.canvas.height/2 - 20 + (i * 40)
                );
            });
            
            // Draw Play Again button
            this.ctx.fillStyle = 'rgba(0, 100, 255, 0.8)';
            this.ctx.fillRect(
                this.restartButton.x,
                this.restartButton.y,
                this.restartButton.width,
                this.restartButton.height
            );
            
            // Button text
            this.ctx.font = 'bold 20px Arial';
            this.ctx.fillStyle = 'white';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('Play Again', 
                this.restartButton.x + this.restartButton.width/2,
                this.restartButton.y + this.restartButton.height/2
            );
        }
    }

    generateLevel(levelNumber) {
        // Base difficulty parameters that scale with level
        const difficulty = Math.min(1 + (levelNumber - 1) * 0.1, 3); // Caps at 3x difficulty
        const baseWindStrength = 0.5 * difficulty;
        const timeLimit = Math.max(90 - levelNumber * 1.5, 30); // Decreases from 90s to 30s
        
        // Calculate number of obstacles based on level
        const numWindmills = Math.min(Math.floor(levelNumber / 3), 5);
        const numBalloons = Math.min(Math.floor((levelNumber - 1) / 4), 4);
        const numWindZones = Math.min(Math.floor((levelNumber - 1) / 2), 6);

        // Generate star positions
        const stars = this.generateStarPositions(3, numWindmills);
        
        // Generate obstacles
        const obstacles = [
            ...this.generateWindmills(numWindmills, difficulty),
            ...this.generateBalloons(numBalloons)
        ];

        // Generate wind zones
        const windZones = this.generateWindZones(numWindZones, difficulty);

        // Goal position varies by level
        const goalPos = this.generateGoalPosition(levelNumber);

        return {
            stars,
            goal: goalPos,
            windStrength: baseWindStrength,
            timeLimit: levelNumber > 5 ? timeLimit : null, // Only add time limit after level 5
            obstacles,
            windZones
        };
    }

    generateStarPositions(numStars, numObstacles) {
        const stars = [];
        const minDistance = 100; // Minimum distance between stars
        
        for (let i = 0; i < numStars; i++) {
            let validPosition = false;
            let attempts = 0;
            let x, y;

            while (!validPosition && attempts < 50) {
                x = 200 + Math.random() * (this.canvas.width - 400);
                y = 50 + Math.random() * (this.canvas.height - 150);
                
                // Check distance from other stars
                validPosition = stars.every(star => 
                    Math.hypot(star.x - x, star.y - y) > minDistance
                );
                attempts++;
            }

            stars.push({ x, y });
        }
        return stars;
    }

    generateWindmills(count, difficulty) {
        const windmills = [];
        const minDistance = 150;

        for (let i = 0; i < count; i++) {
            let validPosition = false;
            let attempts = 0;
            let x, y;

            while (!validPosition && attempts < 50) {
                x = 200 + Math.random() * (this.canvas.width - 400);
                y = 100 + Math.random() * (this.canvas.height - 200);
                
                validPosition = windmills.every(mill => 
                    Math.hypot(mill.x - x, mill.y - y) > minDistance
                );
                attempts++;
            }

            windmills.push({
                type: 'windmill',
                x,
                y,
                radius: 70 + Math.random() * 40,
                speed: (Math.random() > 0.5 ? 1 : -1) * 
                       (0.02 + Math.random() * 0.02) * difficulty
            });
        }
        return windmills;
    }

    generateBalloons(count) {
        const balloons = [];
        const minDistance = 100;

        for (let i = 0; i < count; i++) {
            let validPosition = false;
            let attempts = 0;
            let x, y;

            while (!validPosition && attempts < 50) {
                x = 150 + Math.random() * (this.canvas.width - 300);
                y = 100 + Math.random() * (this.canvas.height - 300);
                
                validPosition = balloons.every(balloon => 
                    Math.hypot(balloon.x - x, balloon.y - y) > minDistance
                );
                attempts++;
            }

            balloons.push({
                type: 'balloon',
                x,
                y,
                radius: 25 + Math.random() * 15,
                amplitude: 80 + Math.random() * 60,
                frequency: 0.02 + Math.random() * 0.02,
                phase: Math.random() * Math.PI * 2
            });
        }
        return balloons;
    }

    generateWindZones(count, difficulty) {
        const windZones = [];
        const minDistance = 100;

        for (let i = 0; i < count; i++) {
            let validPosition = false;
            let attempts = 0;
            let x, y;

            while (!validPosition && attempts < 50) {
                x = 100 + Math.random() * (this.canvas.width - 300);
                y = 50 + Math.random() * (this.canvas.height - 200);
                
                validPosition = windZones.every(zone => 
                    Math.hypot(zone.x - x, zone.y - y) > minDistance
                );
                attempts++;
            }

            const width = 100 + Math.random() * 150;
            const height = 100 + Math.random() * 150;
            const force = {
                x: (Math.random() * 2 - 1) * 2 * difficulty,
                y: (Math.random() * 2 - 1) * 2 * difficulty
            };

            windZones.push({
                x,
                y,
                width,
                height,
                force,
                visible: true,
                oscillating: Math.random() > 0.5,
                frequency: 0.005 + Math.random() * 0.015
            });
        }
        return windZones;
    }

    generateGoalPosition(levelNumber) {
        // Vary goal position based on level number
        const angle = (levelNumber % 4) * Math.PI / 2;
        const radius = 200;
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        return {
            x: centerX + Math.cos(angle) * radius,
            y: centerY + Math.sin(angle) * radius,
            radius: 30,
            baseGlow: 20,
            currentGlow: 20,
            completed: false
        };
    }

    restart() {
        // Reset game state
        this.currentLevel = 1;
        this.gameState = 'playing';
        this.score = {
            current: 0,
            total: 300,
            display: 0
        };
        this.totalTime = 0;
        this.levelTime = 0;
        this.crash.active = false;
        this.crash.particles = [];
        
        // Initialize first level
        this.initLevel(1);
    }
}

// Start the game when the page loads
window.onload = () => {
    new Game();
};