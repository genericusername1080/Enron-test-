
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { GameState } from '../types';

interface Scene3DProps {
    gameState: React.MutableRefObject<GameState>;
    cutaway: boolean;
}

const Scene3D: React.FC<Scene3DProps> = ({ gameState, cutaway }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const composerRef = useRef<EffectComposer | null>(null);
    const materialsRef = useRef<any>({});
    const meshesRef = useRef<THREE.InstancedMesh[]>([]);
    const particlesRef = useRef<any[]>([]);
    const weatherSystemRef = useRef<THREE.Points | null>(null);
    const sunRef = useRef<THREE.DirectionalLight | null>(null);
    const ambientRef = useRef<THREE.AmbientLight | null>(null);
    
    // Sky Colors
    const SKY_DAWN = new THREE.Color(0xffaa44);
    const SKY_DAY = new THREE.Color(0x87CEEB);
    const SKY_DUSK = new THREE.Color(0xcc6666);
    const SKY_NIGHT = new THREE.Color(0x050510);

    useEffect(() => {
        if (!containerRef.current) return;

        const scene = new THREE.Scene();
        sceneRef.current = scene;
        scene.fog = new THREE.FogExp2(0x050510, 0.015);

        const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(70, 60, 70);
        cameraRef.current = camera;

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        containerRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.maxPolarAngle = Math.PI / 2 - 0.1; // Prevent going under ground
        controls.target.set(0, 5, 0);

        // Post Processing
        const renderScene = new RenderPass(scene, camera);
        const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.2, 0.5, 0.9);
        const composer = new EffectComposer(renderer);
        composer.addPass(renderScene);
        composer.addPass(bloomPass);
        composerRef.current = composer;

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
        ambientRef.current = ambientLight;
        scene.add(ambientLight);

        const sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 2048;
        sunLight.shadow.mapSize.height = 2048;
        sunLight.shadow.camera.near = 0.5;
        sunLight.shadow.camera.far = 200;
        sunLight.shadow.camera.left = -50;
        sunLight.shadow.camera.right = 50;
        sunLight.shadow.camera.top = 50;
        sunLight.shadow.camera.bottom = -50;
        sunRef.current = sunLight;
        scene.add(sunLight);

        // Materials
        materialsRef.current = {
            grass: new THREE.MeshStandardMaterial({ color: 0x2d4c1e, roughness: 0.8 }),
            dirt: new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.9 }),
            water: new THREE.MeshStandardMaterial({ color: 0x1e88e5, roughness: 0.1, metalness: 0.8, transparent: true, opacity: 0.8 }),
            concrete: new THREE.MeshStandardMaterial({ color: 0x90a4ae, roughness: 0.7 }),
            steel: new THREE.MeshStandardMaterial({ color: 0xb0bec5, metalness: 0.7, roughness: 0.3 }),
            glass: new THREE.MeshStandardMaterial({ color: 0x88ccff, transparent: true, opacity: 0.4, metalness: 0.9, roughness: 0.0 }),
            wood: new THREE.MeshStandardMaterial({ color: 0x4e342e }),
            leaves: new THREE.MeshStandardMaterial({ color: 0x33691e }),
            
            // FX
            steam: new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.3, depthWrite: false }),
            smoke: new THREE.MeshStandardMaterial({ color: 0x111111, transparent: true, opacity: 0.6, depthWrite: false }),
            fire: new THREE.MeshStandardMaterial({ color: 0xff5500, emissive: 0xffaa00, emissiveIntensity: 4.0 }),
            glow: new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 2.0 }),
            radGlow: new THREE.MeshStandardMaterial({ color: 0x00ff00, emissive: 0x00ff00, emissiveIntensity: 2.0, transparent: true, opacity: 0.5 }),
            coreBlue: new THREE.MeshStandardMaterial({ color: 0x0088ff, emissive: 0x0088ff, emissiveIntensity: 3.0 }),
            window_lit: new THREE.MeshStandardMaterial({ color: 0xffeb3b, emissive: 0xffaa00, emissiveIntensity: 2.0 }),
        };

        // --- Terrain Generation ---
        const generateTerrain = () => {
            const size = 120;
            const segments = 60;
            const geom = new THREE.PlaneGeometry(size, size, segments, segments);
            const posAttr = geom.attributes.position;
            
            for (let i = 0; i < posAttr.count; i++) {
                const x = posAttr.getX(i);
                const y = posAttr.getY(i);
                // Simple pseudo-noise
                const z = Math.sin(x * 0.1) * Math.cos(y * 0.1) * 2 + Math.random() * 0.2;
                posAttr.setZ(i, z > 0 ? z : -2); // Dip down for water
            }
            geom.computeVertexNormals();
            geom.rotateX(-Math.PI / 2);
            geom.translate(0, -0.5, 0); // Lower slightly

            const mesh = new THREE.Mesh(geom, materialsRef.current.grass);
            mesh.receiveShadow = true;
            scene.add(mesh);

            // Water Plane
            const waterGeom = new THREE.PlaneGeometry(size, size);
            waterGeom.rotateX(-Math.PI / 2);
            waterGeom.translate(0, -1.5, 0);
            const water = new THREE.Mesh(waterGeom, materialsRef.current.water);
            scene.add(water);
        };
        generateTerrain();

        // --- Particle System (Steam/Smoke) ---
        const createParticle = (x: number, z: number, startY: number) => {
            const geo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
            const mat = materialsRef.current.steam;
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(x, startY, z);
            mesh.castShadow = false;
            mesh.receiveShadow = false;
            scene.add(mesh);
            return { mesh, speed: 0.05 + Math.random() * 0.1, initialX: x, initialZ: z, initialY: startY };
        };

        // Initialize particles
        for(let i=0; i<40; i++) particlesRef.current.push(createParticle(-20, 15, 26));
        for(let i=0; i<40; i++) particlesRef.current.push(createParticle(-20, -15, 26));

        // --- Weather System (Rain/Snow) ---
        const createWeatherSystem = () => {
            const geometry = new THREE.BufferGeometry();
            const count = 3000;
            const positions = new Float32Array(count * 3);
            for(let i=0; i<count*3; i+=3) {
                positions[i] = (Math.random() - 0.5) * 100;
                positions[i+1] = Math.random() * 80;
                positions[i+2] = (Math.random() - 0.5) * 100;
            }
            geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            const material = new THREE.PointsMaterial({
                color: 0xaaaaaa,
                size: 0.3,
                transparent: true,
                opacity: 0.0 
            });
            const points = new THREE.Points(geometry, material);
            scene.add(points);
            weatherSystemRef.current = points;
        };
        createWeatherSystem();

        // --- Animation Loop ---
        let animationId: number;
        const animate = () => {
            animationId = requestAnimationFrame(animate);
            if (!gameState.current) return;
            const state = gameState.current;
            const time = state.dayTime; // 0 to 24

            // --- Day/Night Cycle ---
            // 0=Midnight, 6=Dawn, 12=Noon, 18=Dusk
            let skyColor = SKY_NIGHT;
            let sunIntensity = 0;
            let sunY = -10;
            let sunX = 80;

            const timeRad = ((time - 6) / 24) * Math.PI * 2; // Offset so 6am is sunrise
            sunX = Math.cos(timeRad) * 100;
            sunY = Math.sin(timeRad) * 80;

            if (sunRef.current) {
                sunRef.current.position.set(sunX, sunY, 20);
                sunRef.current.intensity = Math.max(0, Math.sin(timeRad) * 1.5);
            }

            // Interpolate Sky Color
            if (time >= 5 && time < 8) skyColor = new THREE.Color().lerpColors(SKY_NIGHT, SKY_DAWN, (time-5)/3);
            else if (time >= 8 && time < 16) skyColor = new THREE.Color().lerpColors(SKY_DAWN, SKY_DAY, (time-8)/8);
            else if (time >= 16 && time < 19) skyColor = new THREE.Color().lerpColors(SKY_DAY, SKY_DUSK, (time-16)/3);
            else if (time >= 19 && time < 21) skyColor = new THREE.Color().lerpColors(SKY_DUSK, SKY_NIGHT, (time-19)/2);
            else skyColor = SKY_NIGHT;

            // Weather Override for Sky
            if (state.weather === 'rainy' || state.weather === 'thunderstorm') {
                skyColor.lerp(new THREE.Color(0x222222), 0.8);
                if (sunRef.current) sunRef.current.intensity *= 0.3;
            } else if (state.weather === 'snowy') {
                skyColor.lerp(new THREE.Color(0x888899), 0.6);
                if (sunRef.current) sunRef.current.intensity *= 0.5;
            }

            // Lightning
            if (state.weather === 'thunderstorm' && Math.random() > 0.98) {
                skyColor = new THREE.Color(0xffffff); // Flash
                if(ambientRef.current) ambientRef.current.intensity = 2.0;
            } else {
                 if(ambientRef.current) ambientRef.current.intensity = 0.2 + (sunY > 0 ? 0.3 : 0);
            }

            scene.background = skyColor;
            scene.fog?.color.set(skyColor);

            // --- Reactor Visuals ---
            const temp = state.temp;
            materialsRef.current.glow.emissiveIntensity = 1 + (temp/1000);
            materialsRef.current.glow.color.setHSL(0.5 - (temp/3000)*0.5, 1, 0.5);
            materialsRef.current.radGlow.opacity = Math.min(0.8, state.radiation / 500);

            // --- Particles (Steam/Smoke) ---
            const showFire = state.temp > 2500;
            const showSmoke = state.pumpHealth < 50 || state.turbineHealth < 50;
            
            particlesRef.current.forEach(p => {
                p.mesh.position.y += p.speed;
                // Wind effect
                p.mesh.position.x += 0.02; 
                p.mesh.scale.multiplyScalar(0.98);
                
                if (p.mesh.position.y > 45 || p.mesh.scale.x < 0.1) {
                    p.mesh.position.y = p.initialY;
                    p.mesh.position.x = p.initialX;
                    p.mesh.scale.set(1, 1, 1);
                    if (showFire && Math.random() > 0.6) p.mesh.material = materialsRef.current.fire;
                    else if (showSmoke && Math.random() > 0.7) p.mesh.material = materialsRef.current.smoke;
                    else p.mesh.material = materialsRef.current.steam;
                }
            });

            // --- Weather Particles ---
            if (weatherSystemRef.current) {
                const positions = weatherSystemRef.current.geometry.attributes.position.array;
                const isRain = state.weather === 'rainy' || state.weather === 'thunderstorm';
                const isSnow = state.weather === 'snowy';
                
                if (isRain || isSnow) {
                    weatherSystemRef.current.material.opacity = 0.6;
                    weatherSystemRef.current.material.color.setHex(isRain ? 0x88ccff : 0xffffff);
                    
                    for(let i=1; i<positions.length; i+=3) {
                        positions[i] -= isRain ? 1.5 : 0.2; // Snow falls slower
                        if(positions[i] < 0) {
                            positions[i] = 60 + Math.random() * 20;
                        }
                    }
                    weatherSystemRef.current.geometry.attributes.position.needsUpdate = true;
                } else {
                    weatherSystemRef.current.material.opacity = 0;
                }
            }

            controls.update();
            composer.render();
        };
        animate();

        const handleResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
            composer.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener('resize', handleResize);

        return () => {
            cancelAnimationFrame(animationId);
            window.removeEventListener('resize', handleResize);
            renderer.dispose();
        };
    }, []);

    // Rebuild Scene Meshes (Voxels)
    useEffect(() => {
        if (!sceneRef.current) return;
        const scene = sceneRef.current;
        meshesRef.current.forEach(mesh => scene.remove(mesh));
        meshesRef.current = [];

        const voxelData: any[] = [];
        const addVoxel = (type: string, x: number, y: number, z: number) => voxelData.push({ type, x, y, z });

        const score = gameState.current.score;
        const time = gameState.current.dayTime;
        const isNight = time < 6 || time > 18;

        // Reactor Core
        const buildReactor = (cx: number, cz: number) => {
            for(let y=0; y<16; y++) {
                for(let x=-10; x<=10; x++) {
                    for(let z=-10; z<=10; z++) {
                        if (cutaway && z > 0) continue;
                        const dist = Math.sqrt(x*x + z*z);
                        if (dist <= 10 && dist > 8.5) addVoxel('concrete', cx+x, y, cz+z);
                        if (y < 8 && dist < 4) {
                            if (dist < 2) addVoxel('coreBlue', cx+x, y, cz+z);
                            else addVoxel('glow', cx+x, y, cz+z);
                        }
                    }
                }
            }
        };

        // Skyscrapers
        const buildSkyscraper = (cx: number, cz: number, h: number, w: number) => {
            for(let y=0; y<h; y++) {
                for(let x=-w; x<=w; x++) {
                    for(let z=-w; z<=w; z++) {
                        if(x===-w || x===w || z===-w || z===w) {
                            const isWindow = (y%3!==0) && (x+z)%2===0;
                            // Lit windows at night randomly
                            const isLit = isWindow && isNight && Math.random() > 0.4;
                            addVoxel(isLit ? 'window_lit' : (isWindow ? 'glass' : 'steel'), cx+x, y, cz+z);
                        }
                    }
                }
            }
        };

        // Nature: Trees
        const buildTree = (cx: number, cz: number) => {
            addVoxel('wood', cx, 0, cz);
            addVoxel('wood', cx, 1, cz);
            addVoxel('leaves', cx, 2, cz);
            addVoxel('leaves', cx+1, 2, cz);
            addVoxel('leaves', cx-1, 2, cz);
            addVoxel('leaves', cx, 2, cz+1);
            addVoxel('leaves', cx, 2, cz-1);
            addVoxel('leaves', cx, 3, cz);
        };

        buildReactor(0, 0);
        buildSkyscraper(25, 15, 12, 4);
        if (score > 60) buildSkyscraper(25, -15, 20, 5);
        if (score > 100) buildSkyscraper(45, 0, 35, 7);

        // Random trees in the world
        const rng = (seed: number) => {
            const x = Math.sin(seed) * 10000;
            return x - Math.floor(x);
        };
        for(let i=0; i<30; i++) {
            const rX = Math.floor(rng(i)*100 - 50);
            const rZ = Math.floor(rng(i+100)*100 - 50);
            // Don't build in reactor or buildings
            if(Math.abs(rX) > 15 || Math.abs(rZ) > 15) {
                buildTree(rX, rZ);
            }
        }

        // Instancing
        const types: Record<string, any[]> = {};
        voxelData.forEach(v => {
            if(!types[v.type]) types[v.type] = [];
            types[v.type].push(v);
        });

        const geo = new THREE.BoxGeometry(1, 1, 1);
        Object.keys(types).forEach(type => {
            const mesh = new THREE.InstancedMesh(geo, materialsRef.current[type], types[type].length);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            const matrix = new THREE.Matrix4();
            types[type].forEach((v, i) => {
                matrix.setPosition(v.x, v.y, v.z);
                mesh.setMatrixAt(i, matrix);
            });
            scene.add(mesh);
            meshesRef.current.push(mesh);
        });

    }, [cutaway, gameState.current.score, gameState.current.dayCount > 0 ? 'night' : 'day']); // Simple re-render trigger on state change if needed

    return <div ref={containerRef} className="absolute inset-0 z-0" />;
};

export default Scene3D;
