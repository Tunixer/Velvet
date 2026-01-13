/**
 * Three.js Scene Manager
 * Manages 3D scene, camera, lighting, and rendering
 */

import * as THREE from 'three';

/**
 * Scene manager for cloth simulation
 */
export class SceneManager {
    readonly scene: THREE.Scene;
    readonly camera: THREE.PerspectiveCamera;
    readonly renderer: THREE.WebGLRenderer;

    // Camera controls
    private cameraDistance: number = 5;
    private cameraRotationX: number = -0.5;
    private cameraRotationY: number = 0.5;
    private isDragging: boolean = false;
    private lastMouseX: number = 0;
    private lastMouseY: number = 0;

    // Container
    private container: HTMLElement;

    constructor(container: HTMLElement) {
        this.container = container;

        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1a2e);

        // Create camera
        this.camera = new THREE.PerspectiveCamera(
            60,
            container.clientWidth / container.clientHeight,
            0.1,
            1000
        );
        this.updateCameraPosition();

        // Create renderer
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
        });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(this.renderer.domElement);

        // Setup lighting
        this.setupLighting();

        // Setup resize handler
        this.setupResizeHandler();

        // Setup mouse controls
        this.setupMouseControls();
    }

    /**
     * Setup scene lighting
     */
    private setupLighting(): void {
        // Ambient light
        const ambient = new THREE.AmbientLight(0x404040, 0.5);
        this.scene.add(ambient);

        // Directional light (sun)
        const sun = new THREE.DirectionalLight(0xffffff, 1);
        sun.position.set(5, 10, 5);
        sun.castShadow = true;
        sun.shadow.mapSize.width = 2048;
        sun.shadow.mapSize.height = 2048;
        sun.shadow.camera.near = 0.5;
        sun.shadow.camera.far = 50;
        this.scene.add(sun);

        // Fill light
        const fill = new THREE.DirectionalLight(0x8888ff, 0.3);
        fill.position.set(-5, 5, -5);
        this.scene.add(fill);

        // Point light for highlights
        const point = new THREE.PointLight(0xffaa00, 0.5);
        point.position.set(0, 5, 0);
        this.scene.add(point);
    }

    /**
     * Update camera position based on rotation
     */
    private updateCameraPosition(): void {
        const x =
            this.cameraDistance * Math.sin(this.cameraRotationY) * Math.cos(this.cameraRotationX);
        const y = this.cameraDistance * Math.sin(this.cameraRotationX);
        const z =
            this.cameraDistance * Math.cos(this.cameraRotationY) * Math.cos(this.cameraRotationX);

        this.camera.position.set(x, y, z);
        this.camera.lookAt(0, 0, 0);
    }

    /**
     * Setup mouse controls for camera rotation
     */
    private setupMouseControls(): void {
        const canvas = this.renderer.domElement;

        canvas.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
        });

        canvas.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;

            const deltaX = e.clientX - this.lastMouseX;
            const deltaY = e.clientY - this.lastMouseY;

            this.cameraRotationY += deltaX * 0.01;
            this.cameraRotationX += deltaY * 0.01;

            // Clamp vertical rotation
            this.cameraRotationX = Math.max(
                -Math.PI / 2 + 0.1,
                Math.min(Math.PI / 2 - 0.1, this.cameraRotationX)
            );

            this.updateCameraPosition();

            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
        });

        canvas.addEventListener('mouseup', () => {
            this.isDragging = false;
        });

        canvas.addEventListener('mouseleave', () => {
            this.isDragging = false;
        });

        // Zoom with mouse wheel
        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            this.cameraDistance += e.deltaY * 0.01;
            this.cameraDistance = Math.max(2, Math.min(20, this.cameraDistance));
            this.updateCameraPosition();
        });
    }

    /**
     * Setup window resize handler
     */
    private setupResizeHandler(): void {
        window.addEventListener('resize', () => {
            const width = this.container.clientWidth;
            const height = this.container.clientHeight;

            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();

            this.renderer.setSize(width, height);
        });
    }

    /**
     * Render the scene
     */
    render(): void {
        this.renderer.render(this.scene, this.camera);
    }

    /**
     * Add object to scene
     */
    add(object: THREE.Object3D): void {
        this.scene.add(object);
    }

    /**
     * Remove object from scene
     */
    remove(object: THREE.Object3D): void {
        this.scene.remove(object);
    }

    /**
     * Dispose of resources
     */
    dispose(): void {
        this.renderer.dispose();
        this.container.removeChild(this.renderer.domElement);
    }
}
