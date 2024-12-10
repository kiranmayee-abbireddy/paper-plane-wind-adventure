class Game {
    constructor() {
        // Initialize intro plane first
        this.introPlane = {
            angle: 0,          // Current angle in radians
            radius: 150,       // Radius of circular path
            speed: 0.02,       // Angular velocity
            wobble: 0,         // Wobble effect phase
            trail: [],         // Array to store trail positions
            x: 0,             // Current x position
            y: 0              // Current y position
        };

        this.canvas = document.getElementById('gameCanvas');
        
        // Initialize boundaries first
        this.boundaries = {
            bottom: 0,  // Will be set in setupCanvas
            left: 0,
            right: 0,   // Will be set in setupCanvas
            groundSpeed: 8
        };
        
        // Add background elements before canvas setup
        this.clouds = Array(10).fill(null).map(() => ({
            x: Math.random() * this.canvas.width,
            y: Math.random() * (this.canvas.height * 0.6),
            width: 80 + Math.random() * 120,
            speed: 0.2 + Math.random() * 0.3,
            opacity: 0.5 + Math.random() * 0.4
        }));
        
        // Ground perspective points - moved lower
        this.groundVanishingPoint = {
            x: this.canvas.width / 2,
            y: this.canvas.height * 4.25  // Changed from 0.65 to 0.8
        };
        
        // Set up responsive canvas size
        this.setupCanvas();
        
        // Initialize sound effects with reliable Mixkit URLs
        this.sounds = {
            crash: this.createSoundPool('https://assets.mixkit.co/active_storage/sfx/1018/1018-preview.mp3', 3),  // Heavy crash
            gameOver: this.createSoundPool('https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3', 2),  // Current game over
            levelComplete: this.createSoundPool('https://assets.mixkit.co/active_storage/sfx/2020/2020-preview.mp3', 2),  // Success sound
            starCollect: this.createSoundPool('https://assets.mixkit.co/active_storage/sfx/1114/1114-preview.mp3', 3),  // Short coin/star collect
            backgroundMusic: this.createBackgroundMusic('sounds/theme.mp3')  // Add background music
        };

        // Initialize background music
        this.initBackgroundMusic();

        // Sound state
        this.soundEnabled = localStorage.getItem('paperPlaneSoundEnabled') !== 'false';
        
        // Set volume for all sound instances
        Object.entries(this.sounds).forEach(([key, sound]) => {
            if (Array.isArray(sound)) {  // Sound pool
                sound.forEach(audio => {
                    audio.volume = 0.5;
                    audio.load();
                });
            } else {  // Single audio (background music)
                sound.volume = 0.3;
                sound.load();
            }
        });

        // Add sound toggle button
        this.soundButton = {
            x: this.canvas.width - 50,  // Move it 50px from right edge
            y: 50,  // Changed from 20 to 50 to move it lower
            width: 30,
            height: 30
        };

        // Add click handler for sound toggle
        this.canvas.addEventListener('click', this.handleSoundToggle.bind(this));
        
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
        
        // Add player name tracking
        this.playerName = localStorage.getItem('paperPlaneName') || this.askPlayerName();
        
        // Add high score tracking with player names
        this.highScore = parseInt(localStorage.getItem('paperPlaneHighScore')) || 0;
        this.highScoreHolder = localStorage.getItem('paperPlaneHighScoreHolder') || this.playerName;
        
        // Modify score object to track level scores
        this.score = {
            current: 0,
            total: 300,     // Per level total (100 points per star)
            display: 0,     // For score animation
            levelStart: 0,  // Score at the start of current level
            highest: this.highScore
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
        this.levelCompleteShown = true;
        
        // Add wind effect zones
        this.windZones = [];
        
        // Enhanced wind particle system
        this.windParticles = [];
        this.windEffects = {
            particles: [],
            maxParticles: 100,
            trailLength: 5
        };
        
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

    themes = [
        // Daytime themes
        {
            name: 'Morning Dawn',
            sky: ['#FF7F50', '#87CEEB', '#E0FFFF'],
            ground: ['#90EE90', '#228B22', '#006400']
        },
        {
            name: 'Sunny Day',
            sky: ['#1e90ff', '#87ceeb', '#b0e2ff'],
            ground: ['#7AB55C', '#5C8A42', '#3F6D29']
        },
        {
            name: 'Desert Noon',
            sky: ['#00BFFF', '#87CEEB', '#F0F8FF'],
            ground: ['#DEB887', '#D2691E', '#8B4513']
        },
        {
            name: 'Tropical Paradise',
            sky: ['#40E0D0', '#48D1CC', '#AFEEEE'],
            ground: ['#98FB98', '#3CB371', '#2E8B57']
        },
        {
            name: 'Autumn Evening',
            sky: ['#FF8C00', '#FFA500', '#FFD700'],
            ground: ['#DAA520', '#CD853F', '#8B4513']
        },
        {
            name: 'Purple Sunset',
            sky: ['#4B0082', '#8A2BE2', '#9370DB'],
            ground: ['#556B2F', '#2F4F4F', '#1A332F']
        },
        {
            name: 'Golden Hour',
            sky: ['#FF4500', '#FF8C00', '#FFD700'],
            ground: ['#228B22', '#006400', '#004225']
        },
        {
            name: 'Starry Night',
            sky: ['#191970', '#000080', '#00008B'],
            ground: ['#3A5F0B', '#2F4F4F', '#1A332F']
        },
        {
            name: 'Northern Lights',
            sky: ['#4B0082', '#00FF7F', '#00FFFF'],
            ground: ['#191970', '#000080', '#00008B']
        },
        {
            name: 'Moonlit Valley',
            sky: ['#483D8B', '#4169E1', '#1E90FF'],
            ground: ['#2F4F4F', '#2E8B57', '#006400']
        },
        // Fantasy themes
        {
            name: 'Candy Land',
            sky: ['#FF69B4', '#FFB6C1', '#FFC0CB'],  // Pink variations
            ground: ['#98FB98', '#90EE90', '#3CB371']  // Mint greens
        },
        {
            name: 'Alien World',
            sky: ['#8A2BE2', '#9932CC', '#9370DB'],  // Purple hues
            ground: ['#00FA9A', '#00FF7F', '#98FB98']  // Neon greens
        },
        {
            name: 'Volcanic',
            sky: ['#000000', '#333333', '#666666'],
            ground: ['#8B4513', '#CD853F', '#DAA520']
        },
        {
            name: 'Arctic',
            sky: ['#FFFFFF', '#ADD8E6', '#87CEEB'],
            ground: ['#FFFFFF', '#E0FFFF', '#B0E0E6']
        },
        {
            name: 'Ocean',
            sky: ['#000080', '#0000CD', '#0000FF'],
            ground: ['#00FFFF', '#20B2AA', '#008080']
        },
        {
            name: 'Forest',
            sky: ['#008000', '#228B22', '#2E8B57'],
            ground: ['#32CD32', '#006400', '#004225']
        },
        {
            name: 'Mountain',
            sky: ['#808080', '#A9A9A9', '#D3D3D3'],
            ground: ['#FFFFFF', '#F5F5F5', '#DCDCDC']
        },
        {
            name: 'Desert Storm',
            sky: ['#FFD700', '#FFA500', '#FF8C00'],
            ground: ['#DEB887', '#D2691E', '#8B4513']
        },
        {
            name: 'Jungle',
            sky: ['#32CD32', '#228B22', '#006400'],
            ground: ['#98FB98', '#3CB371', '#2E8B57']
        },
        {
            name: 'Misty Morning',
            sky: ['#F0F0F0', '#D3D3D3', '#C0C0C0'],
            ground: ['#98FB98', '#90EE90', '#3CB371']
        },
        {
            name: 'Rainy Day',
            sky: ['#87CEEB', '#4682B4', '#1E90FF'],
            ground: ['#708090', '#696969', '#483D8B']
        },
        {
            name: 'Cherry Blossom',
            sky: ['#FFC0CB', '#FFB6C1', '#FF69B4'],
            ground: ['#FFFFFF', '#FFFACD', '#FAFAD2']
        },
        {
            name: 'Autumn Forest',
            sky: ['#FFA500', '#FF8C00', '#FF4500'],
            ground: ['#D2691E', '#8B4513', '#A0522D']
        },
        {
            name: 'Winter Wonderland',
            sky: ['#ADD8E6', '#87CEEB', '#00BFFF'],
            ground: ['#FFFFFF', '#F0FFF0', '#F0FFFF']
        },
        {
            name: 'Sunset Beach',
            sky: ['#FFA07A', '#FF7F50', '#FF6347'],
            ground: ['#FFDAB9', '#FFE4B5', '#FFDEAD']
        },
        {
            name: 'Spring Meadow',
            sky: ['#98FB98', '#90EE90', '#3CB371'],
            ground: ['#FFFACD', '#FAFAD2', '#FFEFD5']
        },
        {
            name: 'Twilight',
            sky: ['#800080', '#9400D3', '#8A2BE2'],
            ground: ['#4B0082', '#6A5ACD', '#7B68EE']
        },
        {
            name: 'Crystal Cave',
            sky: ['#FF00FF', '#EE82EE', '#DA70D6'],
            ground: ['#9370DB', '#8A2BE2', '#800080']
        },
        {
            name: 'Rainbow Valley',
            sky: ['#FF0000', '#FF7F00', '#FFFF00'],
            ground: ['#00FF00', '#0000FF', '#4B0082']
        },
        {
            name: 'Storm Clouds',
            sky: ['#483D8B', '#696969', '#708090'],
            ground: ['#2F4F4F', '#000000', '#191970']
        }
    ];

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
        
        // Update ground vanishing point
        this.groundVanishingPoint = {
            x: this.canvas.width / 2,
            y: this.canvas.height * 3.25
        };
        
        // Update cloud positions to fit new canvas size
        this.clouds.forEach(cloud => {
            cloud.y = Math.random() * (this.canvas.height * 0.6);
            if (cloud.x > this.canvas.width) {
                cloud.x = -cloud.width;
            }
        });
        
        // Update sound button position with new y-coordinate
        this.soundButton.x = this.canvas.width - 50;
        this.soundButton.y = 50;  // Added to maintain consistent y position
    }

    setupMobileControls() {
        // Touch start handler
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const pos = this.getScaledPosition(touch);
            
            // If game is in intro state, start the game
            if (this.gameState === 'intro') {
                this.startGame();
                return;
            }
            
            // Store initial touch position and time for swipe detection
            this.touchStartPos = pos;
            this.touchStartTime = Date.now();
            
            // Reduce tap boost amount
            if (this.gameState === 'playing') {
                const dx = pos.x - this.plane.x;
                const dy = pos.y - this.plane.y;
                const length = Math.sqrt(dx * dx + dy * dy);
                
                // Reduced from 3 to 2
                this.plane.velocity.x += (dx / length) * 2;
                this.plane.velocity.y += (dy / length) * 2;
            }
        });

        // Modified touch move handler
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (this.touchStartPos && this.gameState === 'playing') {
                const touch = e.touches[0];
                const currentPos = this.getScaledPosition(touch);
                
                // Calculate swipe distance and direction
                const dx = currentPos.x - this.touchStartPos.x;
                const dy = currentPos.y - this.touchStartPos.y;
                
                // Further reduced sensitivity and increased smoothing
                const sensitivity = 0.008; // Reduced from 0.015
                const targetWindX = dx * sensitivity;
                const targetWindY = dy * sensitivity;
                
                // Increased smoothing for more gradual changes
                const smoothing = 0.08; // Reduced from 0.15 for even smoother transitions
                this.wind.x += (targetWindX - this.wind.x) * smoothing;
                this.wind.y += (targetWindY - this.wind.y) * smoothing;
                
                // Reduced max wind value for more controlled movement
                const maxWind = 1.0; // Reduced from 1.5
                this.wind.x = Math.max(-maxWind, Math.min(maxWind, this.wind.x));
                this.wind.y = Math.max(-maxWind, Math.min(maxWind, this.wind.y));
            }
        });

        // Touch end handler
        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            
            // Handle button taps in game over state
            if (this.gameState === 'gameOver' || 
                (this.gameState === 'completed' && this.currentLevel === this.maxLevels)) {
                const touch = e.changedTouches[0];
                const pos = this.getScaledPosition(touch);
                
                if (pos.x >= this.restartButton.x && 
                    pos.x <= this.restartButton.x + this.restartButton.width &&
                    pos.y >= this.restartButton.y && 
                    pos.y <= this.restartButton.y + this.restartButton.height) {
                    this.restart();
                }
            }
            
            // Gradually reduce wind when touch ends
            const windReduction = () => {
                this.wind.x *= 0.8;
                this.wind.y *= 0.8;
                
                if (Math.abs(this.wind.x) > 0.01 || Math.abs(this.wind.y) > 0.01) {
                    requestAnimationFrame(windReduction);
                } else {
                    this.wind.x = 0;
                    this.wind.y = 0;
                }
            };
            windReduction();
            
            this.touchStartPos = null;
            this.touchStartTime = null;
        });

        // Touch cancel handler
        this.canvas.addEventListener('touchcancel', (e) => {
            e.preventDefault();
            this.wind.x = 0;
            this.wind.y = 0;
            this.touchStartPos = null;
            this.touchStartTime = null;
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

        // Animate score display with high score consideration
        if (this.score.display < this.score.current) {
            this.score.display = Math.min(
                this.score.display + 5,
                this.score.current
            );
            
            // Update high score in real-time if current score exceeds it
            if (this.score.current > this.score.highest) {
                this.score.highest = this.score.current;
                localStorage.setItem('paperPlaneHighScore', this.score.highest);
                localStorage.setItem('paperPlaneHighScoreHolder', this.playerName);
            }
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
                    // Play star collection sound
                    this.playSound('starCollect');
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
        // Score board background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.fillRect(20, 20, this.canvas.width - 40, 40);
        
        // Score text
        this.ctx.font = 'bold 20px Arial';
        this.ctx.fillStyle = 'white';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`Score: ${this.score.display}`, 30, 47);
        
        // Player name and level in center
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`${this.playerName} - Level ${this.currentLevel}`, this.canvas.width / 2, 47);
        
        // High score with holder name
        this.ctx.textAlign = 'right';
        const highScoreText = `Best: ${this.score.highest} (${this.highScoreHolder})`;
        this.ctx.fillStyle = this.score.current > this.score.highest ? '#FFD700' : 'white';
        this.ctx.fillText(highScoreText, this.canvas.width - 30, 47);
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

    drawInstructions() {
        if (this.gameState === 'intro' && this.introPlane) {  // Add safety check
            // Full opacity intro screen
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            
            // Title with textured gradient
            this.ctx.save();

            // Before drawing the title text, update the font
            // Use Bangers font for main title
            this.ctx.font = 'bold 72px "Bangers", cursive';  // Increased size and changed font

            // Create base gradient
            const titleGradient = this.ctx.createLinearGradient(
                this.canvas.width/2,
                this.canvas.height/2 - 120,
                this.canvas.width/2,
                this.canvas.height/2 - 40
            );

            // Create metallic gradient colors with brighter tones
            titleGradient.addColorStop(0, '#34e89e');    // Bright teal green
            titleGradient.addColorStop(0.3, '#0f9b0f');  // Bright green
            titleGradient.addColorStop(0.6, '#ff3e3e');  // Bright red
            titleGradient.addColorStop(1, '#ff7b00');    // Bright orange

            // Add letter spacing effect for Bangers font
            this.ctx.letterSpacing = '5px';

            // Draw outer black border
            this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
            this.ctx.lineWidth = 4;
            this.ctx.strokeText('Paper Plane Adventure', 
                this.canvas.width/2, 
                this.canvas.height/2 - 80
            );

            // Create texture pattern
            const patternCanvas = document.createElement('canvas');
            const patternCtx = patternCanvas.getContext('2d');
            const patternSize = 64;
            patternCanvas.width = patternSize;
            patternCanvas.height = patternSize;

            // Draw noise pattern
            patternCtx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            for (let i = 0; i < 100; i++) {
                const x = Math.random() * patternSize;
                const y = Math.random() * patternSize;
                const size = Math.random() * 2 + 1;
                patternCtx.fillRect(x, y, size, size);
            }

            // Create pattern from the noise canvas
            const pattern = this.ctx.createPattern(patternCanvas, 'repeat');

            // Set composite operation for texture blend
            this.ctx.globalCompositeOperation = 'source-over';

            // Draw main text with gradient
            this.ctx.fillStyle = titleGradient;
            this.ctx.fillText('Paper Plane Adventure', 
                this.canvas.width/2, 
                this.canvas.height/2 - 80
            );

            // Apply texture overlay
            this.ctx.globalCompositeOperation = 'overlay';
            this.ctx.fillStyle = pattern;
            this.ctx.fillText('Paper Plane Adventure', 
                this.canvas.width/2, 
                this.canvas.height/2 - 80
            );

            // Add metallic highlight
            this.ctx.globalCompositeOperation = 'soft-light';
            const highlightGradient = this.ctx.createLinearGradient(
                this.canvas.width/2,
                this.canvas.height/2 - 120,
                this.canvas.width/2,
                this.canvas.height/2 - 40
            );
            highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.5)');    // Brighter highlight
            highlightGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.15)'); // Subtle middle
            highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0.3)');    // Medium bottom highlight

            this.ctx.fillStyle = highlightGradient;
            this.ctx.fillText('Paper Plane Adventure', 
                this.canvas.width/2, 
                this.canvas.height/2 - 80
            );

            // Reset composite operation
            this.ctx.globalCompositeOperation = 'source-over';

            // Add subtle inner shadow
            this.ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
            this.ctx.shadowBlur = 4;
            this.ctx.shadowOffsetX = 2;
            this.ctx.shadowOffsetY = 2;
            this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
            this.ctx.lineWidth = 1;
            this.ctx.strokeText('Paper Plane Adventure', 
                this.canvas.width/2, 
                this.canvas.height/2 - 80
            );

            this.ctx.restore();
            
            // Byline with subtle gradient
            this.ctx.save();
            const bylineGradient = this.ctx.createLinearGradient(
                this.canvas.width/2 - 50,
                this.canvas.height/2 - 40,
                this.canvas.width/2 + 50,
                this.canvas.height/2 - 40
            );
            bylineGradient.addColorStop(0, '#CCCCCC');
            bylineGradient.addColorStop(1, '#FFFFFF');
            
            this.ctx.font = 'bold 28px "Press Start 2P", cursive';  // Pixel font for byline
            this.ctx.fillStyle = bylineGradient;
            this.ctx.fillText('by Kiryee', 
                this.canvas.width/2, 
                this.canvas.height/2 - 20  // Adjusted position
            );
            this.ctx.restore();
            
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
                this.ctx.fillStyle = 'white';
                this.ctx.fillText(text, 
                    this.canvas.width/2, 
                    this.canvas.height/2 + 20 + (i * 30)
                );
            });
            
            // Update and draw animated plane
            if (this.introPlane) {  // Add another safety check
                this.introPlane.angle = (this.introPlane.angle + this.introPlane.speed) % (Math.PI * 2);
                this.introPlane.wobble += 0.05;
                
                // Calculate infinity path position
                const centerX = this.canvas.width/2;
                const centerY = this.canvas.height/2 - 80; // Center around title
                const a = 200; // Width of infinity
                const b = 80;  // Height of infinity
                
                // Parametric equations for infinity symbol (lemniscate)
                const t = this.introPlane.angle;
                const x = centerX + a * Math.cos(t) / (1 + Math.sin(t) * Math.sin(t));
                const y = centerY + b * Math.cos(t) * Math.sin(t) / (1 + Math.sin(t) * Math.sin(t));
                
                // Calculate rotation angle based on path direction
                const dx = -a * (Math.sin(t) * (1 + Math.sin(t) * Math.sin(t)) + 2 * Math.cos(t) * Math.cos(t) * Math.sin(t)) / ((1 + Math.sin(t) * Math.sin(t)) * (1 + Math.sin(t) * Math.sin(t)));
                const dy = b * (Math.cos(t) * Math.cos(t) - Math.sin(t) * Math.sin(t)) / ((1 + Math.sin(t) * Math.sin(t)) * (1 + Math.sin(t) * Math.sin(t)));
                const rotation = Math.atan2(dy, dx);
                
                // Draw animated plane
                this.ctx.save();
                this.ctx.translate(x, y);
                this.ctx.rotate(rotation);
                
                // Draw trail
                this.ctx.beginPath();
                this.ctx.moveTo(-40, 0);
                for(let i = 1; i <= 5; i++) {
                    const trailX = -40 - (i * 8);
                    const alpha = 0.3 * (1 - i/5);
                    this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
                    this.ctx.fillRect(trailX, -1, 8, 2);
                }
                
                // Draw plane matching the game plane design
                this.ctx.beginPath();
                this.ctx.moveTo(-40, 0);  // Tail
                this.ctx.lineTo(40, 0);   // Top edge
                this.ctx.lineTo(0, 30);   // Bottom point
                this.ctx.lineTo(-5, 15);  // Tail detail
                this.ctx.lineTo(-40, 0);  // Back to tail
                
                // Add wing detail
                this.ctx.moveTo(-20, 5);
                this.ctx.lineTo(0, 5);
                
                // Create gradient for plane
                const planeGradient = this.ctx.createLinearGradient(-40, 0, 40, 30);
                planeGradient.addColorStop(0, '#FFFFFF');
                planeGradient.addColorStop(0.5, '#F0F0F0');
                planeGradient.addColorStop(1, '#E0E0E0');
                
                this.ctx.fillStyle = planeGradient;
                this.ctx.fill();
                
                // Add glow effect
                this.ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
                this.ctx.shadowBlur = 15;
                this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
                this.ctx.stroke();
                
                this.ctx.restore();
            }
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

        // Draw the new background
        this.drawBackground();

        // Draw wind zones before obstacles
        this.drawWindZones();

        // Draw obstacles
        this.drawObstacles();

        // Draw stars
        this.drawStars();
        
        // Draw goal
        this.drawGoal();

        // Draw wind effects
        this.drawWindEffects();
        
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

        // Draw crash effect
        this.drawCrashEffect();

        // Draw UI elements on top
        this.drawScore();
        this.drawWindIndicator();
        this.drawSoundButton();
        
        // Draw all overlays last
        this.drawInstructions();
        this.drawGameOver();
        this.drawGameComplete();

        // Draw level transition overlay if active
        if (this.levelTransitioning) {
            // Use semi-transparent black overlay instead of blue gradient
            this.ctx.fillStyle = `rgba(0, 0, 0, ${this.transitionAlpha * 0.5})`; // Reduced opacity to 0.5
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            if (this.transitionAlpha >= 0.5) {
                // Add glow effect to text
                this.ctx.shadowColor = 'white';
                this.ctx.shadowBlur = 20;
                this.ctx.font = 'bold 48px Arial';
                this.ctx.fillStyle = 'white';
                this.ctx.textAlign = 'center';
                
                if (this.levelCompleteShown) {
                    // Show level complete message
                    this.ctx.fillText('Level Complete!', 
                        this.canvas.width/2, 
                        this.canvas.height/2
                    );
                    
                    // Show level score
                    this.ctx.font = 'bold 24px Arial';
                    this.ctx.shadowBlur = 10;
                    this.ctx.fillText(`Score: ${this.score.display}`, 
                        this.canvas.width/2, 
                        this.canvas.height/2 + 50
                    );
                } else {
                    // Show next level title
                    this.ctx.fillText(`Level ${this.currentLevel}`, 
                        this.canvas.width/2, 
                        this.canvas.height/2
                    );
                }
                // Reset shadow
                this.ctx.shadowBlur = 0;
            }
        }
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
            // Play crash sound immediately
            this.playSound('crash');
            
            // Stop background music
            this.stopBackgroundMusic();
            
            // Set crash state after playing sound
            this.crash.active = true;
            this.crash.startTime = this.time;
            
            // Create particles for crash effect
            for (let i = 0; i < 30; i++) {
                this.crash.particles.push({
                    x: this.plane.x,
                    y: this.plane.y,
                    vx: (Math.random() - 0.5) * 15,
                    vy: (Math.random() - 0.5) * 15,
                    size: Math.random() * 8 + 3,
                    color: Math.random() > 0.5 ? 'white' : '#333'
                });
            }

            // Delay game over state and sound slightly
            setTimeout(() => {
                this.gameState = 'gameOver';
                this.playSound('gameOver');
                
                // Update high score if current score is higher
                if (this.score.current > this.score.highest) {
                    this.score.highest = this.score.current;
                    this.highScoreHolder = this.playerName;
                    localStorage.setItem('paperPlaneHighScore', this.score.highest);
                    localStorage.setItem('paperPlaneHighScoreHolder', this.highScoreHolder);
                }
            }, 100); // Short delay before game over
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
        
        // Update score total for this level
        this.score.total = levelConfig.stars.length * 100;
        
        // Don't reset the score, just update the display
        this.score.display = this.score.current;
        
        // Initialize wind particles
        this.initWindParticles();
    }

    startNextLevel() {
        if (this.currentLevel < this.maxLevels) {
            this.levelTransitioning = true;
            this.transitionAlpha = 0;
            this.levelCompleteShown = true;
            
            // Store the current score as the level start score
            this.score.levelStart = this.score.current;
            
            // Play level complete sound
            this.playSound('levelComplete');
            
            // First show "Level Complete"
            const showLevelComplete = () => {
                this.transitionAlpha += 0.02;
                if (this.transitionAlpha >= 1) {
                    setTimeout(() => {
                        // Start fading out level complete
                        const fadeLevelComplete = () => {
                            this.transitionAlpha -= 0.02;
                            if (this.transitionAlpha <= 0) {
                                // Now show next level title
                                this.currentLevel++;
                                this.levelCompleteShown = false;
                                this.transitionAlpha = 0;
                                
                                // Initialize next level before showing its title
                                this.initLevel(this.currentLevel);
                                showNextLevel();
                            } else {
                                requestAnimationFrame(fadeLevelComplete);
                            }
                        };
                        fadeLevelComplete();
                    }, 1000); // Show "Level Complete" for 1 second
                } else {
                    requestAnimationFrame(showLevelComplete);
                }
            };

            // Then show next level title
            const showNextLevel = () => {
                this.transitionAlpha += 0.02;
                if (this.transitionAlpha >= 1) {
                    setTimeout(() => {
                        // Fade out and start playing
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
                    }, 1000); // Show next level title for 1 second
                } else {
                    requestAnimationFrame(showNextLevel);
                }
            };

            // Start the transition sequence
            showLevelComplete();
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
                `Player: ${this.playerName}`,
                `Final Score: ${this.score.display}`,
                `High Score: ${this.score.highest} (${this.highScoreHolder})`,
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
        // Reset existing game state
        this.currentLevel = 1;
        this.gameState = 'playing';
        this.score = {
            current: 0,
            total: 300,
            display: 0,
            levelStart: 0,
            highest: this.highScore
        };
        this.totalTime = 0;
        this.crash.active = false;
        this.crash.particles = [];
        
        // Reset all sounds
        Object.values(this.sounds).forEach(sound => {
            if (Array.isArray(sound)) {  // Sound pool
                sound.forEach(audio => {
                    audio.pause();
                    audio.currentTime = 0;
                });
            } else {  // Single audio (background music)
                sound.pause();
                sound.currentTime = 0;
            }
        });
        
        // Restart background music
        this.startBackgroundMusic();
        
        // Initialize first level
        this.initLevel(1);
    }

    drawBackground() {
        const theme = this.themes[(this.currentLevel - 1) % this.themes.length];
        
        // Draw sky gradient with theme colors
        const skyGradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height * 0.8);
        skyGradient.addColorStop(0, theme.sky[0]);    // Top color
        skyGradient.addColorStop(0.5, theme.sky[1]);  // Middle color
        skyGradient.addColorStop(1, theme.sky[2]);    // Horizon color
        
        this.ctx.fillStyle = skyGradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw clouds
        this.clouds.forEach(cloud => {
            this.drawCloud(cloud);
            
            // Move clouds
            cloud.x += cloud.speed;
            if (cloud.x > this.canvas.width + cloud.width) {
                cloud.x = -cloud.width;
                cloud.y = Math.random() * (this.canvas.height * 0.6);
            }
        });
        
        // Draw ground with theme colors
        this.drawPerspectiveGround(theme);
    }

    drawPerspectiveGround(theme) {
        this.ctx.save();
        
        // Create base gradient for ground with sky blend
        const groundGradient = this.ctx.createLinearGradient(
            0, this.groundVanishingPoint.y - 100, // Start gradient above horizon
            0, this.canvas.height
        );
        
        // Add more color stops for smoother transition
        groundGradient.addColorStop(0, theme.sky[2]);     // Start with sky color
        groundGradient.addColorStop(0.1, theme.ground[0]); // Blend to ground color
        groundGradient.addColorStop(0.4, theme.ground[1]); // Middle ground color
        groundGradient.addColorStop(1, theme.ground[2]);   // Bottom ground color
        
        // Draw main ground with extended area for blending
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.groundVanishingPoint.y - 100); // Start above horizon
        this.ctx.lineTo(this.canvas.width, this.groundVanishingPoint.y - 100);
        this.ctx.lineTo(this.canvas.width, this.canvas.height);
        this.ctx.lineTo(0, this.canvas.height);
        this.ctx.fillStyle = groundGradient;
        this.ctx.fill();
        
        // Add a subtle atmospheric haze at the horizon
        const hazeGradient = this.ctx.createLinearGradient(
            0, this.groundVanishingPoint.y - 100,
            0, this.groundVanishingPoint.y + 100
        );
        hazeGradient.addColorStop(0, `rgba(${hexToRgb(theme.sky[2])}, 0.6)`);
        hazeGradient.addColorStop(1, `rgba(${hexToRgb(theme.sky[2])}, 0)`);
        
        this.ctx.fillStyle = hazeGradient;
        this.ctx.fillRect(0, this.groundVanishingPoint.y - 100, 
            this.canvas.width, 200);
        
        // Helper function to convert hex to rgb
        function hexToRgb(hex) {
            const r = parseInt(hex.slice(1,3), 16);
            const g = parseInt(hex.slice(3,5), 16);
            const b = parseInt(hex.slice(5,7), 16);
            return `${r}, ${g}, ${b}`;
        }
        
        // Create wave colors based on theme ground colors
        const createWaveColor = (baseColor, alpha) => {
            const r = parseInt(baseColor.slice(1,3), 16);
            const g = parseInt(baseColor.slice(3,5), 16);
            const b = parseInt(baseColor.slice(5,7), 16);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        };
        
        // Draw grass waves with theme-matched colors
        const layers = [
            // Use theme colors for waves, from lighter to darker
            { 
                amp: 15, 
                freq: 0.02, 
                offset: 50, 
                color: createWaveColor(theme.ground[0], 0.3), 
                width: 2 
            },
            { 
                amp: 12, 
                freq: 0.03, 
                offset: 40, 
                color: createWaveColor(theme.ground[0], 0.25), 
                width: 2 
            },
            { 
                amp: 10, 
                freq: 0.02, 
                offset: 30, 
                color: createWaveColor(theme.ground[1], 0.3), 
                width: 1.5 
            },
            { 
                amp: 8, 
                freq: 0.04, 
                offset: 20, 
                color: createWaveColor(theme.ground[1], 0.25), 
                width: 1.5 
            },
            { 
                amp: 5, 
                freq: 0.03, 
                offset: 10, 
                color: createWaveColor(theme.ground[2], 0.3), 
                width: 1 
            }
        ];
        
        // Draw wave layers
        const drawWaveLayer = (amplitude, frequency, yOffset, color, width) => {
            this.ctx.beginPath();
            this.ctx.moveTo(0, this.canvas.height);
            
            // Draw waves from bottom up
            for (let x = 0; x <= this.canvas.width; x += 2) {
                const normalizedX = x / this.canvas.width;
                const perspective = 1 - (yOffset / this.canvas.height); // Perspective scaling
                const wave = Math.sin(x * frequency + this.time + yOffset) * amplitude * perspective;
                const y = this.canvas.height - yOffset + wave;
                
                if (x === 0) {
                    this.ctx.moveTo(x, y);
                } else {
                    this.ctx.lineTo(x, y);
                }
            }
            
            // Complete the path
            this.ctx.lineTo(this.canvas.width, this.canvas.height);
            this.ctx.lineTo(0, this.canvas.height);
            
            // Fill with theme-matched color
            this.ctx.fillStyle = color;
            this.ctx.lineWidth = width;
            this.ctx.fill();
        };
        
        // Draw all wave layers
        layers.forEach(layer => {
            drawWaveLayer(layer.amp, layer.freq, layer.offset, layer.color, layer.width);
        });
        
        // Draw subtle perspective lines with theme-matched color
        const numLines = 15;
        const spacing = this.canvas.width / numLines;
        
        // Use the darkest ground color for perspective lines
        this.ctx.strokeStyle = createWaveColor(theme.ground[2], 0.1);
        this.ctx.lineWidth = 1;
        
        // Draw fewer, more subtle vertical lines
        for (let x = 0; x <= this.canvas.width; x += spacing * 2) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, this.groundVanishingPoint.y);
            const endX = this.groundVanishingPoint.x + (x - this.groundVanishingPoint.x) * 2;
            this.ctx.lineTo(endX, this.canvas.height);
            this.ctx.stroke();
        }
        
        this.ctx.restore();
    }

    // Add method to ask for player name
    askPlayerName() {
        let name = prompt('Enter your name:', 'Player');
        name = (name || 'Player').trim().substring(0, 10); // Limit to 10 characters
        localStorage.setItem('paperPlaneName', name);
        return name;
    }

    drawCloud(cloud) {
        this.ctx.save();
        this.ctx.translate(cloud.x, cloud.y);
        
        // Set cloud color and opacity
        this.ctx.fillStyle = `rgba(255, 255, 255, ${cloud.opacity})`;
        
        // Draw cloud shapes
        const circles = [
            { x: 0, y: 0, r: cloud.width * 0.2 },
            { x: cloud.width * 0.2, y: 0, r: cloud.width * 0.3 },
            { x: cloud.width * 0.4, y: cloud.width * 0.1, r: cloud.width * 0.2 },
            { x: cloud.width * 0.2, y: cloud.width * 0.1, r: cloud.width * 0.25 },
            { x: cloud.width * 0.5, y: -cloud.width * 0.05, r: cloud.width * 0.2 }
        ];
        
        circles.forEach(circle => {
            this.ctx.beginPath();
            this.ctx.arc(circle.x, circle.y, circle.r, 0, Math.PI * 2);
            this.ctx.fill();
        });
        
        this.ctx.restore();
    }

    // Add method to preload sounds
    preloadSounds() {
        // Preload all sound effects
        Object.values(this.sounds).forEach(sound => {
            if (Array.isArray(sound)) {  // Sound pool
                sound.forEach(audio => {
                    audio.load();
                    audio.play().then(() => {
                        audio.pause();
                        audio.currentTime = 0;
                    }).catch(() => {
                        // Ignore autoplay errors
                    });
                });
            } else {  // Background music
                sound.load();
            }
        });
    }

    // Add sound toggle handler
    handleSoundToggle(e) {
        const rect = this.canvas.getBoundingClientRect();
        const clickX = (e.clientX - rect.left) * (this.canvas.width / rect.width);
        const clickY = (e.clientY - rect.top) * (this.canvas.height / rect.height);

        if (clickX >= this.soundButton.x && 
            clickX <= this.soundButton.x + this.soundButton.width &&
            clickY >= this.soundButton.y && 
            clickY <= this.soundButton.y + this.soundButton.height) {
            this.soundEnabled = !this.soundEnabled;
            localStorage.setItem('paperPlaneSoundEnabled', this.soundEnabled);
        }
    }

    // Improved sound playing method
    playSound(soundName) {
        if (!this.soundEnabled || !this.sounds[soundName]) return;

        // Find an available sound instance from the pool
        const soundPool = this.sounds[soundName];
        const availableSound = soundPool.find(sound => sound.paused || sound.ended);
        
        if (availableSound) {
            availableSound.currentTime = 0;
            
            // Ensure volume is set correctly
            availableSound.volume = 0.5;
            
            // Play sound with promise handling
            const playPromise = availableSound.play();
            
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.log('Sound playback failed:', error);
                });
            }
        }
    }

    // Add sound button drawing
    drawSoundButton() {
        this.ctx.save();
        
        // Draw button background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.fillRect(
            this.soundButton.x,
            this.soundButton.y,
            this.soundButton.width,
            this.soundButton.height
        );

        // Draw sound icon
        this.ctx.beginPath();
        this.ctx.fillStyle = 'white';
        
        if (this.soundEnabled) {
            // Speaker icon
            this.ctx.moveTo(this.soundButton.x + 8, this.soundButton.y + 10);
            this.ctx.lineTo(this.soundButton.x + 13, this.soundButton.y + 10);
            this.ctx.lineTo(this.soundButton.x + 18, this.soundButton.y + 5);
            this.ctx.lineTo(this.soundButton.x + 18, this.soundButton.y + 25);
            this.ctx.lineTo(this.soundButton.x + 13, this.soundButton.y + 20);
            this.ctx.lineTo(this.soundButton.x + 8, this.soundButton.y + 20);
            this.ctx.closePath();
            this.ctx.fill();
            
            // Sound waves
            this.ctx.beginPath();
            this.ctx.arc(this.soundButton.x + 20, this.soundButton.y + 15, 5, -Math.PI/3, Math.PI/3);
            this.ctx.stroke();
            this.ctx.beginPath();
            this.ctx.arc(this.soundButton.x + 20, this.soundButton.y + 15, 8, -Math.PI/3, Math.PI/3);
            this.ctx.stroke();
        } else {
            // Muted speaker icon with X
            this.ctx.moveTo(this.soundButton.x + 8, this.soundButton.y + 10);
            this.ctx.lineTo(this.soundButton.x + 13, this.soundButton.y + 10);
            this.ctx.lineTo(this.soundButton.x + 18, this.soundButton.y + 5);
            this.ctx.lineTo(this.soundButton.x + 18, this.soundButton.y + 25);
            this.ctx.lineTo(this.soundButton.x + 13, this.soundButton.y + 20);
            this.ctx.lineTo(this.soundButton.x + 8, this.soundButton.y + 20);
            this.ctx.closePath();
            this.ctx.fill();
            
            // X
            this.ctx.beginPath();
            this.ctx.moveTo(this.soundButton.x + 20, this.soundButton.y + 10);
            this.ctx.lineTo(this.soundButton.x + 25, this.soundButton.y + 20);
            this.ctx.moveTo(this.soundButton.x + 25, this.soundButton.y + 10);
            this.ctx.lineTo(this.soundButton.x + 20, this.soundButton.y + 20);
            this.ctx.strokeStyle = 'white';
            this.ctx.stroke();
        }
        
        this.ctx.restore();
    }

    // Create a pool of audio instances for each sound
    createSoundPool(url, size) {
        return Array(size).fill(null).map(() => {
            const audio = new Audio(url);
            audio.preload = 'auto';
            return audio;
        });
    }

    // Initialize background music
    initBackgroundMusic() {
        const music = this.sounds.backgroundMusic;
        
        // Start playing when game starts
        this.canvas.addEventListener('click', () => {
            if (this.gameState === 'intro' && this.soundEnabled) {
                music.play().catch(error => {
                    console.log('Music playback failed:', error);
                });
            }
        });

        // Handle music when sound is toggled
        const originalHandleSoundToggle = this.handleSoundToggle;
        this.handleSoundToggle = (e) => {
            originalHandleSoundToggle.call(this, e);
            if (this.soundEnabled) {
                music.play().catch(() => {});
            } else {
                music.pause();
            }
        };

        // Add music controls to game state changes
        this.startBackgroundMusic = () => {
            if (this.soundEnabled) {
                music.currentTime = 0;
                music.play().catch(() => {});
            }
        };

        this.stopBackgroundMusic = () => {
            if (!this.soundEnabled) {  // Only stop if sound is disabled
                music.pause();
            }
        };

        // Modify visibility change handler to maintain music state
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.soundEnabled && this.gameState === 'playing') {
                // Only try to resume music if returning to tab and sound is enabled
                music.play().catch(() => {});
            }
        });
    }

    createBackgroundMusic(url) {
        const audio = new Audio(url);
        audio.loop = true;  // Enable looping
        audio.volume = 0.3; // Lower volume for background music
        return audio;
    }
} // Single closing brace for the Game class

// Modify window.onload to preload sounds
window.onload = () => {
    const game = new Game();
    game.preloadSounds();
};