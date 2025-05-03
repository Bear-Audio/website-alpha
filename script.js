import { GLTFLoader } from './three.min.js/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from './three.min.js/examples/jsm/controls/OrbitControls.js';

class SceneManager {
    constructor() {
        this.canvas = document.getElementById('product-canvas');
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: this.canvas,
            antialias: true,
            alpha: true 
        });
        
        this.model = null;
        this.scrollPercent = 0;
        
        this.init();
        this.setupLights();
        this.loadModel();
        this.setupEventListeners();
        this.animate();
    }

    init() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
        this.renderer.setClearColor(0xffffff, 0);
        this.scene.background = null;
        
        // Adjust camera 
        this.camera.fov = 45;
        this.camera.position.set(0, 0, 50);
        this.camera.lookAt(0, 0, 0);
        this.camera.updateProjectionMatrix();
        
        this.controls = new OrbitControls(this.camera, this.canvas);
        //this.controls.enabled = false;
    }

    setupLights() {
        this.scene.children
            .filter(child => child.isLight)
            .forEach(light => this.scene.remove(light));
            
        // ambient light for more shadows
        const ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.8);
        this.scene.add(ambientLight);

        // main light for highlights
        const mainLight = new THREE.DirectionalLight(0xFFFFFF, 4.0);
        mainLight.position.set(2, 5, 5);
        this.scene.add(mainLight);

        // Magenta spotlight 
        const spotLight = new THREE.SpotLight(0xFF00FF, 10);
        spotLight.position.set(-5, 10, 5);
        spotLight.angle = Math.PI / 4;
        spotLight.penumbra = 0.5;
        this.scene.add(spotLight);

        //  rim light
        const rimLight = new THREE.PointLight(0x4B0082, 3, 100);
        rimLight.position.set(5, -5, -5);
        this.scene.add(rimLight);
    }

    loadModel() {
        const loader = new GLTFLoader();
        
        loader.load('./models/scene.gltf', 
            (gltf) => {
                this.model = gltf.scene;
                
                this.model.traverse((child) => {
                    if (child.isMesh) {
                        if (child.material) {
                            const newMaterial = new THREE.MeshPhysicalMaterial({
                                color: 0xE100FF,          // Bright magenta base
                                metalness: 1.0,           // Fully metallic
                                roughness: 0.2,           // Slightly rougher for better contrast
                                clearcoat: 1.0,           // Add gloss
                                clearcoatRoughness: 0.1,  // Make clearcoat shiny
                                emissive: 0x9400D3,       // Purple glow
                                emissiveIntensity: 0.3,   // Subtle glow
                                reflectivity: 1.0,        // Maximum reflectivity
                                ior: 2.0                  //  more  highlights
                            });
                            child.material = newMaterial;
                        }
                    }
                });

                this.scene.add(this.model);
                
                // Start further below screen
                this.model.position.set(0, -70, 50);
                
                const box = new THREE.Box3().setFromObject(this.model);
                const size = box.getSize(new THREE.Vector3());
                const maxDim = Math.max(size.x, size.y, size.z);
                const scale = 20 / maxDim;
                this.model.scale.setScalar(scale);
                
                // Center horizontally
                const center = box.getCenter(new THREE.Vector3());
                this.model.position.x -= center.x * scale;
            }
        );
    }

    setupEventListeners() {
        window.addEventListener('resize', this.onWindowResize.bind(this));
        window.addEventListener('scroll', this.onScroll.bind(this));
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    onScroll() {
        const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
        this.scrollPercent = window.scrollY / totalHeight;

        // fade effect controls are here
        const hero = document.querySelector('.hero');
        const fadeStartThreshold = 0.1;  // start fade
        const fadeEndThreshold = 0.15;   // end fade faster
        
        if (this.scrollPercent <= fadeStartThreshold) {
            hero.style.opacity = 1;
        } else if (this.scrollPercent <= fadeEndThreshold) {
            const fadeProgress = (this.scrollPercent - fadeStartThreshold) / (fadeEndThreshold - fadeStartThreshold);
            hero.style.opacity = 1 - fadeProgress;
        } else {
            hero.style.opacity = 0;
        }
    }

    updateModel() {
        if (this.model) {
            const progress = this.scrollPercent;

            // Adjust camera position for zoom effect
            this.camera.position.z = this.lerp(50, 100, progress);

            // Adjust model position
            this.model.position.y = this.lerp(-20, 20, progress);
            this.model.position.z = this.lerp(0, 50, progress);

            // Adjust model rotation
            this.model.rotation.x = progress * Math.PI * 2;
            this.model.rotation.y = progress * Math.PI * 2;
            this.model.rotation.z = progress * Math.PI * 2;

            // Adjust model scale
            const scale = this.lerp(20, 25, progress);
            this.model.scale.setScalar(scale);

            // Always update position and rotation regardless of phase
            if (progress < 0.2) {
                // First phase: come up from below to center
                const t = progress / 0.2;
                const yPos = this.lerp(-70, 0, t);
                const zPos = this.lerp(20, 20, t); // Keep zPos constant
                const opacity = 1;

                //this.updateModelTransform(yPos, zPos, scale, progress * Math.PI * 2, opacity);
            } else if (progress < 0.3) {
                // fade out
                const t = (progress - 0.2) / 0.1;
                const yPos = this.lerp(0, 150, t);
                const zPos = this.lerp(20, 100, t);
                const scale = this.lerp(25, 5, t);
                const opacity = 1 - t;

                //this.updateModelTransform(yPos, zPos, scale, progress * Math.PI * 2, opacity);
            } else {
                // Keep the model in its final position but invisible
                //this.updateModelTransform(150, 100, 5, progress * Math.PI * 2, 0);
            }
        }
    }

    updateModelTransform(y, z, scale, rotation, opacity) {
        this.model.position.y = y;
        this.model.position.z = z;
        this.model.scale.setScalar(scale);
        this.model.rotation.y = rotation;
        
        this.model.traverse((child) => {
            if (child.isMesh) {
                if (!child.material.transparent) {
                    child.material.transparent = true;
                }
                child.material.opacity = opacity;
            }
        });
        
        this.model.visible = opacity > 0;
    }

    lerp(start, end, t) {
        // Smoother easing 
        t = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        return start + (end - start) * t;
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));
        
        this.updateModel();
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}


