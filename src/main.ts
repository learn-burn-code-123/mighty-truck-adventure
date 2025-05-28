import * as THREE from 'three';

class Game {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private truck: THREE.Group = new THREE.Group();
    private controls: {
        accelerate: boolean;
        brake: boolean;
        steering: number;
    };
    private lifePoints: number = 3;
    private obstacles: (THREE.Mesh | THREE.Group)[] = [];
    private gameOver: boolean = false;
    private speed: number = 0;
    private readonly MAX_SPEED = 0.2;
    private readonly ACCELERATION = 0.01;
    private readonly DECELERATION = 0.005;
    private gameTime: number = 60; // 60 seconds game duration
    private gameStartTime: number = 0;
    private timerDisplay: HTMLElement | null = null;
    private lastObstacleSpawn: number = 0;
    private readonly OBSTACLE_SPAWN_INTERVAL = 3000; // 3 seconds in milliseconds
    private readonly ROAD_WIDTH = 8;
    private readonly ROAD_LENGTH = 1000;

    constructor() {
        // Initialize Three.js scene
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.getElementById('game-container')?.appendChild(this.renderer.domElement);

        // Initialize controls
        this.controls = {
            accelerate: false,
            brake: false,
            steering: 0
        };

        // Setup scene
        this.setupScene();
        this.setupLights();
        this.createRoad();
        this.createTruck();
        this.setupControls();
        this.createLifeDisplay();
        this.createTimerDisplay();

        // Start game loop
        this.gameStartTime = Date.now();
        this.lastObstacleSpawn = Date.now();
        this.animate();

        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
    }

    private createLifeDisplay(): void {
        const lifeContainer = document.createElement('div');
        lifeContainer.id = 'life-display';
        lifeContainer.style.position = 'fixed';
        lifeContainer.style.top = '20px';
        lifeContainer.style.left = '20px';
        lifeContainer.style.fontSize = '24px';
        lifeContainer.style.color = 'white';
        lifeContainer.style.textShadow = '2px 2px 4px rgba(0,0,0,0.5)';
        document.body.appendChild(lifeContainer);
        this.updateLifeDisplay();
    }

    private updateLifeDisplay(): void {
        const lifeDisplay = document.getElementById('life-display');
        if (lifeDisplay) {
            lifeDisplay.innerHTML = `❤️ x ${this.lifePoints}`;
        }
    }

    private createTimerDisplay(): void {
        const timerContainer = document.createElement('div');
        timerContainer.id = 'timer-display';
        timerContainer.style.position = 'fixed';
        timerContainer.style.top = '20px';
        timerContainer.style.right = '20px';
        timerContainer.style.fontSize = '24px';
        timerContainer.style.color = 'white';
        timerContainer.style.textShadow = '2px 2px 4px rgba(0,0,0,0.5)';
        document.body.appendChild(timerContainer);
        this.timerDisplay = timerContainer;
    }

    private updateTimer(): void {
        if (this.timerDisplay) {
            const elapsedTime = Math.floor((Date.now() - this.gameStartTime) / 1000);
            const remainingTime = Math.max(0, this.gameTime - elapsedTime);
            this.timerDisplay.innerHTML = `⏱️ ${remainingTime}s`;

            if (remainingTime <= 0 && !this.gameOver) {
                this.showWinScreen();
            }
        }
    }

    private showWinScreen(): void {
        const winDiv = document.createElement('div');
        winDiv.style.position = 'fixed';
        winDiv.style.top = '50%';
        winDiv.style.left = '50%';
        winDiv.style.transform = 'translate(-50%, -50%)';
        winDiv.style.fontSize = '48px';
        winDiv.style.color = '#4CAF50';
        winDiv.style.textShadow = '2px 2px 4px rgba(0,0,0,0.5)';
        winDiv.innerHTML = 'You Win! 🎉<br>Refresh to play again';
        document.body.appendChild(winDiv);
        this.gameOver = true;
    }

    private createTruck(): void {
        this.truck = new THREE.Group();

        // Truck body (yellow construction truck)
        const bodyGeometry = new THREE.BoxGeometry(2, 1, 4);
        const bodyMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xFFD700,
            roughness: 0.7,
            metalness: 0.3
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        this.truck.add(body);

        // Truck cabin
        const cabinGeometry = new THREE.BoxGeometry(1.5, 1.2, 2);
        const cabinMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x333333,
            roughness: 0.5,
            metalness: 0.5
        });
        const cabin = new THREE.Mesh(cabinGeometry, cabinMaterial);
        cabin.position.set(0, 1.1, -0.5);
        this.truck.add(cabin);

        // Front loader bucket
        const bucketGeometry = new THREE.BoxGeometry(2.5, 0.8, 1);
        const bucketMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xFFD700,
            roughness: 0.7,
            metalness: 0.3
        });
        const bucket = new THREE.Mesh(bucketGeometry, bucketMaterial);
        bucket.position.set(0, 0.5, 2.5);
        this.truck.add(bucket);

        // Wheels
        const wheelGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.4, 32);
        const wheelMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x333333,
            roughness: 0.8,
            metalness: 0.2
        });
        
        const wheelPositions = [
            [-1, -0.5, 1.5],
            [1, -0.5, 1.5],
            [-1, -0.5, -1.5],
            [1, -0.5, -1.5]
        ];

        wheelPositions.forEach(pos => {
            const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
            wheel.rotation.z = Math.PI / 2;
            wheel.position.set(pos[0], pos[1], pos[2]);
            this.truck.add(wheel);
        });

        // Add details to make it more realistic
        // Headlights
        const headlightGeometry = new THREE.CircleGeometry(0.2, 32);
        const headlightMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xFFFFFF,
            emissive: 0xFFFFFF,
            emissiveIntensity: 0.5
        });
        
        const leftHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
        leftHeadlight.position.set(-0.6, 0.8, -2.1);
        leftHeadlight.rotation.x = Math.PI / 2;
        this.truck.add(leftHeadlight);

        const rightHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
        rightHeadlight.position.set(0.6, 0.8, -2.1);
        rightHeadlight.rotation.x = Math.PI / 2;
        this.truck.add(rightHeadlight);

        // Windshield
        const windshieldGeometry = new THREE.PlaneGeometry(1.2, 0.8);
        const windshieldMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x88CCFF,
            transparent: true,
            opacity: 0.6,
            roughness: 0.1,
            metalness: 0.9
        });
        const windshield = new THREE.Mesh(windshieldGeometry, windshieldMaterial);
        windshield.position.set(0, 1.5, -0.5);
        windshield.rotation.x = Math.PI / 6;
        this.truck.add(windshield);

        this.scene.add(this.truck);
    }

    private createRoad(): void {
        // Create road
        const roadGeometry = new THREE.PlaneGeometry(this.ROAD_WIDTH, this.ROAD_LENGTH);
        const roadMaterial = new THREE.MeshStandardMaterial({
            color: 0x333333,
            roughness: 0.8,
            metalness: 0.2
        });
        const road = new THREE.Mesh(roadGeometry, roadMaterial);
        road.rotation.x = -Math.PI / 2;
        road.position.y = -0.9;
        this.scene.add(road);

        // Add road markings
        const lineGeometry = new THREE.PlaneGeometry(0.2, this.ROAD_LENGTH);
        const lineMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFFFFF,
            roughness: 0.5,
            metalness: 0.5
        });
        const centerLine = new THREE.Mesh(lineGeometry, lineMaterial);
        centerLine.rotation.x = -Math.PI / 2;
        centerLine.position.y = -0.89;
        this.scene.add(centerLine);

        // Add grass on both sides
        const grassGeometry = new THREE.PlaneGeometry(100, this.ROAD_LENGTH);
        const grassMaterial = new THREE.MeshStandardMaterial({
            color: 0x7CFC00,
            roughness: 0.9,
            metalness: 0.1
        });
        
        const leftGrass = new THREE.Mesh(grassGeometry, grassMaterial);
        leftGrass.rotation.x = -Math.PI / 2;
        leftGrass.position.set(-50, -0.95, 0);
        this.scene.add(leftGrass);

        const rightGrass = new THREE.Mesh(grassGeometry, grassMaterial);
        rightGrass.rotation.x = -Math.PI / 2;
        rightGrass.position.set(50, -0.95, 0);
        this.scene.add(rightGrass);
    }

    private createObstacle(): void {
        const obstacleTypes = [
            // Tree
            {
                create: () => {
                    const group = new THREE.Group();
                    
                    // Tree trunk
                    const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.3, 2, 8);
                    const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
                    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
                    trunk.position.y = 1;
                    group.add(trunk);

                    // Tree top
                    const topGeometry = new THREE.ConeGeometry(1, 2, 8);
                    const topMaterial = new THREE.MeshStandardMaterial({ color: 0x228B22 });
                    const top = new THREE.Mesh(topGeometry, topMaterial);
                    top.position.y = 2.5;
                    group.add(top);

                    return group;
                },
                scale: 1
            },
            // Car
            {
                create: () => {
                    const group = new THREE.Group();
                    
                    // Car body
                    const bodyGeometry = new THREE.BoxGeometry(1.5, 0.8, 3);
                    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xFF0000 });
                    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
                    group.add(body);

                    // Car roof
                    const roofGeometry = new THREE.BoxGeometry(1.2, 0.6, 1.5);
                    const roofMaterial = new THREE.MeshStandardMaterial({ color: 0xCC0000 });
                    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
                    roof.position.y = 0.7;
                    roof.position.z = -0.3;
                    group.add(roof);

                    // Wheels
                    const wheelGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 16);
                    const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
                    
                    const wheelPositions = [
                        [-0.8, -0.4, 1],
                        [0.8, -0.4, 1],
                        [-0.8, -0.4, -1],
                        [0.8, -0.4, -1]
                    ];

                    wheelPositions.forEach(pos => {
                        const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
                        wheel.rotation.z = Math.PI / 2;
                        wheel.position.set(pos[0], pos[1], pos[2]);
                        group.add(wheel);
                    });

                    return group;
                },
                scale: 1
            }
        ];

        const type = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
        const obstacle = type.create();
        
        // Random position on the road
        const lane = Math.random() < 0.5 ? -1 : 1;
        const xPos = lane * (this.ROAD_WIDTH / 4);
        const zPos = -50; // Spawn far ahead
        
        obstacle.position.set(xPos, 0, zPos);
        obstacle.scale.set(type.scale, type.scale, type.scale);
        
        this.obstacles.push(obstacle);
        this.scene.add(obstacle);
    }

    private updateObstacles(): void {
        const currentTime = Date.now();
        
        // Spawn new obstacles every 3 seconds
        if (currentTime - this.lastObstacleSpawn >= this.OBSTACLE_SPAWN_INTERVAL) {
            this.createObstacle();
            this.lastObstacleSpawn = currentTime;
        }

        // Move obstacles and remove if they're behind the truck
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obstacle = this.obstacles[i];
            obstacle.position.z += this.speed;

            // Remove obstacles that are far behind
            if (obstacle.position.z > 10) {
                this.scene.remove(obstacle);
                this.obstacles.splice(i, 1);
            }
        }
    }

    private checkCollisions(): void {
        const truckBoundingBox = new THREE.Box3().setFromObject(this.truck);
        
        this.obstacles.forEach(obstacle => {
            const obstacleBoundingBox = new THREE.Box3().setFromObject(obstacle);
            if (truckBoundingBox.intersectsBox(obstacleBoundingBox)) {
                this.lifePoints--;
                this.updateLifeDisplay();
                
                // Move the truck back slightly
                this.truck.position.z += 2;
                this.speed = 0;

                if (this.lifePoints <= 0) {
                    this.gameOver = true;
                    this.showGameOver();
                }
            }
        });
    }

    private showGameOver(): void {
        const gameOverDiv = document.createElement('div');
        gameOverDiv.style.position = 'fixed';
        gameOverDiv.style.top = '50%';
        gameOverDiv.style.left = '50%';
        gameOverDiv.style.transform = 'translate(-50%, -50%)';
        gameOverDiv.style.fontSize = '48px';
        gameOverDiv.style.color = 'red';
        gameOverDiv.style.textShadow = '2px 2px 4px rgba(0,0,0,0.5)';
        gameOverDiv.innerHTML = 'Game Over!<br>Refresh to play again';
        document.body.appendChild(gameOverDiv);
    }

    private setupControls(): void {
        const accelerateBtn = document.getElementById('accelerate');
        const brakeBtn = document.getElementById('brake');
        const steeringWheel = document.getElementById('steering-wheel');

        if (accelerateBtn) {
            accelerateBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.controls.accelerate = true;
            });
            accelerateBtn.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.controls.accelerate = false;
            });
            accelerateBtn.addEventListener('mousedown', () => this.controls.accelerate = true);
            accelerateBtn.addEventListener('mouseup', () => this.controls.accelerate = false);
        }

        if (brakeBtn) {
            brakeBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.controls.brake = true;
            });
            brakeBtn.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.controls.brake = false;
            });
            brakeBtn.addEventListener('mousedown', () => this.controls.brake = true);
            brakeBtn.addEventListener('mouseup', () => this.controls.brake = false);
        }

        if (steeringWheel) {
            let isDragging = false;
            let startX = 0;
            let currentRotation = 0;

            const handleStart = (e: MouseEvent | TouchEvent) => {
                e.preventDefault();
                isDragging = true;
                startX = 'touches' in e ? e.touches[0].clientX : e.clientX;
            };

            const handleMove = (e: MouseEvent | TouchEvent) => {
                if (isDragging) {
                    e.preventDefault();
                    const currentX = 'touches' in e ? e.touches[0].clientX : e.clientX;
                    const deltaX = currentX - startX;
                    const rotation = Math.max(-1, Math.min(1, deltaX / 100));
                    this.controls.steering = rotation;
                    
                    // Update steering wheel visual rotation
                    if (steeringWheel) {
                        currentRotation = rotation * 45; // Max 45 degrees rotation
                        steeringWheel.style.transform = `rotate(${currentRotation}deg)`;
                    }
                }
            };

            const handleEnd = (e: MouseEvent | TouchEvent) => {
                e.preventDefault();
                isDragging = false;
                this.controls.steering = 0;
                if (steeringWheel) {
                    steeringWheel.style.transform = 'rotate(0deg)';
                }
            };

            steeringWheel.addEventListener('mousedown', handleStart);
            steeringWheel.addEventListener('touchstart', handleStart);
            window.addEventListener('mousemove', handleMove);
            window.addEventListener('touchmove', handleMove, { passive: false });
            window.addEventListener('mouseup', handleEnd);
            window.addEventListener('touchend', handleEnd);
        }

        // Prevent default touch behaviors
        document.addEventListener('touchmove', (e) => {
            if (e.target === steeringWheel || e.target === accelerateBtn || e.target === brakeBtn) {
                e.preventDefault();
            }
        }, { passive: false });
    }

    private updateTruck(): void {
        if (this.gameOver) return;

        // Update speed based on controls
        if (this.controls.accelerate) {
            this.speed = Math.min(this.MAX_SPEED, this.speed + this.ACCELERATION);
        } else if (this.controls.brake) {
            this.speed = Math.max(-this.MAX_SPEED / 2, this.speed - this.ACCELERATION);
        } else {
            // Natural deceleration
            if (this.speed > 0) {
                this.speed = Math.max(0, this.speed - this.DECELERATION);
            } else if (this.speed < 0) {
                this.speed = Math.min(0, this.speed + this.DECELERATION);
            }
        }

        // Update truck position and rotation
        this.truck.position.z -= this.speed;
        
        // Limit truck movement to road width
        const maxX = this.ROAD_WIDTH / 2 - 1;
        if (this.controls.steering !== 0) {
            const newX = this.truck.position.x + this.controls.steering * 0.2;
            this.truck.position.x = Math.max(-maxX, Math.min(maxX, newX));
            this.truck.rotation.y = this.controls.steering * 0.1;
        }

        // Check for collisions
        this.checkCollisions();

        // Update camera position to follow truck
        this.camera.position.x = this.truck.position.x;
        this.camera.position.z = this.truck.position.z + 10;
        this.camera.lookAt(this.truck.position);

        // Update timer and obstacles
        this.updateTimer();
        this.updateObstacles();
    }

    private setupScene(): void {
        // Add sky
        const skyGeometry = new THREE.SphereGeometry(500, 32, 32);
        const skyMaterial = new THREE.MeshBasicMaterial({
            color: 0x87CEEB,
            side: THREE.BackSide
        });
        const sky = new THREE.Mesh(skyGeometry, skyMaterial);
        this.scene.add(sky);

        // Add ground
        const groundGeometry = new THREE.PlaneGeometry(1000, 1000);
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: 0x7CFC00,
            roughness: 0.8,
            metalness: 0.2
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -1;
        this.scene.add(ground);

        // Position camera
        this.camera.position.set(0, 5, 10);
        this.camera.lookAt(0, 0, 0);
    }

    private setupLights(): void {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 20, 10);
        this.scene.add(directionalLight);
    }

    private onWindowResize(): void {
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
        
        // Adjust camera position based on orientation
        if (width > height) {
            // Landscape
            this.camera.position.set(0, 8, 15);
        } else {
            // Portrait
            this.camera.position.set(0, 5, 10);
        }
        this.camera.lookAt(this.truck.position);
    }

    private animate(): void {
        requestAnimationFrame(() => this.animate());
        this.updateTruck();
        this.renderer.render(this.scene, this.camera);
    }
}

// Start the game when the page loads
window.addEventListener('load', () => {
    new Game();
}); 