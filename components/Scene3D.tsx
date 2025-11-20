import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { GameState } from '../types';
import { MAX_TEMP } from '../constants';

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
    const weatherParticlesRef = useRef<THREE.Mesh[]>([]);
    const steamParticlesRef = useRef<any[]>([]);
    const carsRef = useRef<any[]>([]);
    
    // Colors
    const SKY_COLOR_DAY = new THREE.Color(0x87CEEB);
    const SKY_COLOR_NIGHT = new THREE.Color(0x050510);
    const SKY_COLOR_EVE = new THREE.Color(0xffaa44);

    // Initialize Scene
    useEffect(() => {
        if (!containerRef.current) return;

        const scene = new THREE.Scene();
        scene.background = SKY_COLOR_DAY;
        sceneRef.current = scene;

        const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(60, 50, 60);
        cameraRef.current = camera;

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        containerRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.maxPolarAngle = Math.PI / 2 - 0.02;
        controls.minDistance = 10;
        controls.maxDistance = 180;
        controls.target.set(0, 5, 0);

        // Enhanced Post Processing
        const renderScene = new RenderPass(scene, camera);
        const bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            2.0,  // Increased bloom strength
            0.6,  // Increased radius for softer glow
            0.1   // Lower threshold for more bloom
        );

        const composer = new EffectComposer(renderer);
        composer.addPass(renderScene);
        composer.addPass(bloomPass);
        composerRef.current = composer;

        // Enhanced Lighting System
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
        scene.add(ambientLight);

        // Hemisphere light for better ambient lighting
        const hemiLight = new THREE.HemisphereLight(0x87CEEB, 0x4a5568, 0.5);
        scene.add(hemiLight);

        const sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
        sunLight.position.set(60, 100, 40);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 2048;
        sunLight.shadow.mapSize.height = 2048;
        sunLight.shadow.camera.left = -60;
        sunLight.shadow.camera.right = 60;
        sunLight.shadow.camera.top = 60;
        sunLight.shadow.camera.bottom = -60;
        scene.add(sunLight);

        // Point lights for reactor core (dynamic glow)
        const coreLight = new THREE.PointLight(0x00ffff, 2, 30);
        coreLight.position.set(0, 5, 0);
        scene.add(coreLight);

        // Point lights for cooling towers
        const tower1Light = new THREE.PointLight(0x29b6f6, 0.8, 15);
        tower1Light.position.set(-20, 15, 15);
        scene.add(tower1Light);

        const tower2Light = new THREE.PointLight(0x29b6f6, 0.8, 15);
        tower2Light.position.set(-20, 15, -15);
        scene.add(tower2Light);

        // Street lights and building window lights (will be updated in animation loop)
        const streetLights: THREE.PointLight[] = [];
        for (let i = 0; i < 8; i++) {
            const light = new THREE.PointLight(0xffffff, 0, 8);
            light.position.set(30 + (i % 2) * 10, 5, -20 + i * 6);
            scene.add(light);
            streetLights.push(light);
        }

        // Atmospheric fog
        scene.fog = new THREE.Fog(0x050510, 80, 200);

        // Enhanced Materials with better PBR properties
        materialsRef.current = {
            grass: new THREE.MeshStandardMaterial({ color: 0x4caf50, roughness: 0.95, metalness: 0, envMapIntensity: 0.3 }),
            dirt: new THREE.MeshStandardMaterial({ color: 0x795548, roughness: 0.98, metalness: 0 }),
            wood: new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.9, metalness: 0 }),
            leaves: new THREE.MeshStandardMaterial({ color: 0x388e3c, roughness: 0.95, metalness: 0 }),
            concrete: new THREE.MeshStandardMaterial({ color: 0x90a4ae, roughness: 0.85, metalness: 0.05, envMapIntensity: 0.2 }),
            darkConcrete: new THREE.MeshStandardMaterial({ color: 0x546e7a, roughness: 0.85, metalness: 0.05 }),
            water: new THREE.MeshStandardMaterial({
                color: 0x29b6f6,
                transparent: true,
                opacity: 0.75,
                roughness: 0.1,
                metalness: 0.3,
                envMapIntensity: 1.0
            }),
            steel: new THREE.MeshStandardMaterial({
                color: 0xb0bec5,
                roughness: 0.25,
                metalness: 0.9,
                envMapIntensity: 1.2
            }),
            warning: new THREE.MeshStandardMaterial({
                color: 0xffc107,
                emissive: 0xffc107,
                emissiveIntensity: 0.3,
                roughness: 0.5,
                metalness: 0.2
            }),
            steam: new THREE.MeshStandardMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.5,
                roughness: 1.0,
                metalness: 0
            }),
            glow: new THREE.MeshStandardMaterial({
                color: 0x00ffff,
                emissive: 0x00ffff,
                emissiveIntensity: 2.5,
                roughness: 0.4,
                metalness: 0.6
            }),
            coreBlue: new THREE.MeshStandardMaterial({
                color: 0x0088ff,
                emissive: 0x0088ff,
                emissiveIntensity: 3.5,
                roughness: 0.3,
                metalness: 0.7
            }),
            redControl: new THREE.MeshStandardMaterial({
                color: 0xff0000,
                emissive: 0xff0000,
                emissiveIntensity: 0.8,
                roughness: 0.4,
                metalness: 0.6
            }),
            road: new THREE.MeshStandardMaterial({
                color: 0x333333,
                roughness: 0.9,
                metalness: 0
            }),
            copper: new THREE.MeshStandardMaterial({
                color: 0xc27ba0,
                metalness: 0.8,
                roughness: 0.3,
                envMapIntensity: 1.0
            }),
            transformer: new THREE.MeshStandardMaterial({
                color: 0x263238,
                roughness: 0.7,
                metalness: 0.5
            }),
            fire: new THREE.MeshStandardMaterial({
                color: 0xffaa00,
                emissive: 0xff5500,
                emissiveIntensity: 5.0,
                transparent: true,
                opacity: 0.9,
                roughness: 1.0,
                metalness: 0
            }),
            building_wall: new THREE.MeshStandardMaterial({
                color: 0x607d8b,
                roughness: 0.7,
                metalness: 0.1
            }),
            building_window_off: new THREE.MeshStandardMaterial({
                color: 0x111111,
                roughness: 0.05,
                metalness: 0.9,
                envMapIntensity: 0.5
            }),
            building_window_on: new THREE.MeshStandardMaterial({
                color: 0xffeb3b,
                emissive: 0xffaa00,
                emissiveIntensity: 3.0,
                roughness: 0.1,
                metalness: 0.2
            }),
            street_light: new THREE.MeshStandardMaterial({
                color: 0xffffff,
                emissive: 0xffffdd,
                emissiveIntensity: 2.5,
                roughness: 0.3,
                metalness: 0.1
            }),
            car_body: new THREE.MeshStandardMaterial({
                color: 0xe74c3c,
                roughness: 0.2,
                metalness: 0.8,
                envMapIntensity: 1.0
            }),
            car_light_front: new THREE.MeshStandardMaterial({
                color: 0xffffcc,
                emissive: 0xffffcc,
                emissiveIntensity: 2.5,
                roughness: 0.1,
                metalness: 0.0
            }),
            car_light_back: new THREE.MeshStandardMaterial({
                color: 0xff0000,
                emissive: 0xff0000,
                emissiveIntensity: 1.5,
                roughness: 0.1,
                metalness: 0.0
            }),
            fence: new THREE.MeshStandardMaterial({
                color: 0x9e9e9e,
                roughness: 0.6,
                metalness: 0.7
            }),
            rain: new THREE.MeshBasicMaterial({
                color: 0xaaaaaa,
                transparent: true,
                opacity: 0.5
            }),
            snow: new THREE.MeshBasicMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.9
            }),
            enron_logo: new THREE.MeshStandardMaterial({
                color: 0xeeeeee,
                emissive: 0x3498db,
                emissiveIntensity: 2.5,
                roughness: 0.3,
                metalness: 0.5
            })
        };

        // Steam Particles Init
        const steamGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
        for(let i=0; i<40; i++) {
            const createSteam = (x: number, z: number, startY: number, isFire=false) => {
                const mat = isFire ? materialsRef.current.fire : materialsRef.current.steam;
                const mesh = new THREE.Mesh(steamGeo, mat);
                mesh.position.set(x, startY, z); 
                scene.add(mesh);
                return { mesh, speed: (0.05 + Math.random() * 0.05) * (isFire ? 2 : 1), initialX: x, initialZ: z, time: Math.random() * 10, isFire };
            };
            steamParticlesRef.current.push(createSteam(-20 + (Math.random()-0.5)*4, 15 + (Math.random()-0.5)*4, 26));
            steamParticlesRef.current.push(createSteam(-20 + (Math.random()-0.5)*4, -15 + (Math.random()-0.5)*4, 26));
        }

        // Animation Loop
        let animationId: number;
        const animate = () => {
            animationId = requestAnimationFrame(animate);
            if (!gameState.current) return;
            
            const state = gameState.current;
            const time = state.dayTime;

            // Day/Night Cycle
            let bgColor, sunInt, ambInt, cityLights = 0;
            if(time >= 6 && time < 18) { 
                bgColor = SKY_COLOR_DAY; sunInt = 1.2; ambInt = 0.6; cityLights = 0.0; 
            } else if (time >= 18 && time < 20) { 
                const t = (time - 18) / 2; 
                bgColor = new THREE.Color().lerpColors(SKY_COLOR_DAY, SKY_COLOR_EVE, t); 
                sunInt = 1.2 * (1.0 - t * 0.5); ambInt = 0.6 - t * 0.3; cityLights = t; 
            } else if (time >= 20 || time < 5) { 
                bgColor = SKY_COLOR_NIGHT; sunInt = 0.0; ambInt = 0.1; cityLights = 1.0; 
            } else { 
                const t = (time - 5) / 1; 
                bgColor = new THREE.Color().lerpColors(SKY_COLOR_NIGHT, SKY_COLOR_DAY, t); 
                sunInt = t * 1.2; ambInt = 0.1 + t * 0.5; cityLights = 1.0 - t; 
            }

            // Enhanced Weather Effects with Dynamic Fog
            if (state.weather === 'rainy') {
                bgColor.multiplyScalar(0.7);
                sunInt *= 0.6;
                scene.fog = new THREE.Fog(0x333344, 60, 150);
            } else if (state.weather === 'snowy') {
                bgColor.lerp(new THREE.Color(0xddddff), 0.3);
                sunInt *= 0.8;
                scene.fog = new THREE.Fog(0xddddff, 70, 170);
            } else if (state.weather === 'cloudy') {
                bgColor.lerp(new THREE.Color(0x888888), 0.4);
                sunInt *= 0.5;
                scene.fog = new THREE.Fog(0x666666, 65, 160);
            } else if (state.weather === 'thunderstorm') {
                bgColor.multiplyScalar(0.4);
                sunInt *= 0.3;
                scene.fog = new THREE.Fog(0x1a1a2e, 50, 130);
                if (Math.random() < 0.05) {
                    scene.background = new THREE.Color(0xffffff);
                    sunInt = 2.0;
                    ambInt = 2.0;
                    setTimeout(() => { if(sceneRef.current) sceneRef.current.background = bgColor; }, 50);
                }
            } else {
                // Clear weather
                scene.fog = new THREE.Fog(0x050510, 80, 200);
            }

            if(sceneRef.current) sceneRef.current.background = bgColor;
            sunLight.intensity = sunInt;
            ambientLight.intensity = ambInt;
            hemiLight.intensity = ambInt * 1.2;

            // Update city lights intensity
            materialsRef.current.building_window_on.emissiveIntensity = cityLights * 4.0;
            materialsRef.current.street_light.emissiveIntensity = cityLights * 3.5;
            streetLights.forEach(light => {
                light.intensity = cityLights * 1.2;
            });

            // Core Glow Logic with Dynamic Point Light
            const temp = state.temp;
            const color = new THREE.Color();
            const emissive = new THREE.Color();
            let lightIntensity = 2;

            if(temp < 1000) {
                const t = (temp - 300) / 700;
                color.setHSL(0.6 - t*0.3, 1.0, 0.5);
                emissive.setHSL(0.6 - t*0.3, 1.0, 0.5 + t);
                lightIntensity = 2 + t * 2;
            } else if (temp < 2000) {
                const t = (temp - 1000) / 1000;
                color.setHSL(0.3 - t*0.25, 1.0, 0.5);
                emissive.setHSL(0.3 - t*0.25, 1.0, 1.5 + t);
                lightIntensity = 4 + t * 3;
            } else {
                const t = (temp - 2000) / 1000;
                color.setHSL(0.05 - t*0.05, 1.0, 0.5);
                emissive.setHSL(0.05 - t*0.05, 1.0, 3.0 + t*5.0);
                lightIntensity = 7 + t * 5;
            }

            materialsRef.current.glow.color.copy(color);
            materialsRef.current.glow.emissive.copy(emissive);
            materialsRef.current.glow.emissiveIntensity = 2.5 + (temp / MAX_TEMP) * 3;

            // Update core point light
            coreLight.color.copy(emissive);
            coreLight.intensity = lightIntensity;

            // Cooling tower light pulsing effect
            const pulseFactor = Math.sin(Date.now() * 0.001) * 0.2 + 0.8;
            tower1Light.intensity = 0.8 * pulseFactor;
            tower2Light.intensity = 0.8 * pulseFactor;

            // Enhanced Particle System with scaling and rotation
            steamParticlesRef.current.forEach(p => {
                p.mesh.position.y += p.speed;
                p.time += 0.02;
                p.mesh.position.x = p.initialX + Math.sin(p.time) * (p.isFire ? 0.5 : 1.5);
                p.mesh.position.z = p.initialZ + Math.cos(p.time) * (p.isFire ? 0.5 : 1.5);

                // Scale particles based on height for depth effect
                const heightFactor = p.isFire ?
                    (p.mesh.position.y - 2) / 13 :
                    (p.mesh.position.y - 26) / 19;
                const scale = 0.5 + heightFactor * 1.5;
                p.mesh.scale.set(scale, scale, scale);

                // Rotate particles for more dynamic look
                p.mesh.rotation.y += 0.02;
                p.mesh.rotation.x += 0.01;

                // Fade out particles as they rise
                if (p.mesh.material && 'opacity' in p.mesh.material) {
                    p.mesh.material.opacity = p.isFire ? 0.9 : (0.6 - heightFactor * 0.4);
                }

                if(p.mesh.position.y > (p.isFire ? 15 : 45)) {
                    p.mesh.position.y = p.isFire ? 2 : 26;
                    p.mesh.scale.set(1, 1, 1);
                }
            });

            // Camera Shake on high temp
            if (temp > 2000) {
                const shake = (temp - 2000) / 2000;
                camera.position.x += (Math.random() - 0.5) * shake;
                camera.position.y += (Math.random() - 0.5) * shake;
                camera.position.z += (Math.random() - 0.5) * shake;
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
            if(containerRef.current && renderer.domElement) {
                containerRef.current.removeChild(renderer.domElement);
            }
            renderer.dispose();
            steamParticlesRef.current = [];
        };
    }, []);

    // Rebuild World on Cutaway Toggle
    useEffect(() => {
        if (!sceneRef.current) return;
        const scene = sceneRef.current;
        
        // Clear old meshes
        meshesRef.current.forEach(mesh => {
            scene.remove(mesh);
            mesh.geometry.dispose();
        });
        meshesRef.current = [];

        const voxelData: any[] = [];
        const addVoxel = (type: string, x: number, y: number, z: number, group='default') => {
            voxelData.push({ type, x, y, z, group });
        };

        // --- Generators ---
        const generateReactorDome = (cx: number, cz: number) => {
            const radius = 10; const height = 16;
            for(let y=0; y<8; y++) {
                for(let x=-2; x<=2; x++) {
                    for(let z=-2; z<=2; z++) {
                        if(x*x + z*z <= 4.5) {
                            const isRod = (x+z)%2 !== 0;
                             if (y > 1 && y < 6 && isRod) addVoxel('glow', cx+x, y+1, cz+z, 'core');
                             else if (y >= 6 && y < 8 && isRod) addVoxel('redControl', cx+x, y+1, cz+z, 'rods');
                             else addVoxel('steel', cx+x, y+1, cz+z, 'core');
                        }
                    }
                }
            }
            for(let x=-1; x<=1; x++) for(let z=-1; z<=1; z++) addVoxel('coreBlue', cx+x, 2, cz+z, 'core');
            for(let y=0; y<height; y++) {
                for(let x=-radius; x<=radius; x++) {
                    for(let z=-radius; z<=radius; z++) {
                        if (cutaway && z > 0) continue;
                        const dist = Math.sqrt(x*x + z*z);
                        if (y < 10) { if(dist > radius - 1.5 && dist <= radius) addVoxel('concrete', cx+x, y+1, cz+z, 'dome'); } 
                        else { 
                            const domeY = y - 10; const domeRad = Math.sqrt(radius*radius - domeY*domeY); 
                            if (dist > domeRad - 1.5 && dist <= domeRad) addVoxel('concrete', cx+x, y+1, cz+z, 'dome'); 
                        }
                    }
                }
            }
            // Enron Text
             const fontMap: Record<string, number[][]> = {
                'E': [[1,1,1],[1,0,0],[1,1,1],[1,0,0],[1,1,1]],
                'N': [[1,0,1],[1,1,1],[1,1,1],[1,1,1],[1,0,1]],
                'R': [[1,1,0],[1,0,1],[1,1,0],[1,0,1],[1,0,1]],
                'O': [[0,1,0],[1,0,1],[1,0,1],[1,0,1],[0,1,0]]
            };
            if (!cutaway) {
                let xOffset = -10;
                ['E','N','R','O','N'].forEach(char => {
                    const matrix = fontMap[char];
                    if(matrix) {
                         for(let r=0; r<5; r++) {
                            for(let c=0; c<3; c++) {
                                if(matrix[4-r][c] === 1) addVoxel('enron_logo', xOffset + c, height - 2 + r, radius + 1);
                            }
                        }
                    }
                    xOffset += 4;
                });
            }
        }

        const generateCoolingTower = (cx: number, cz: number) => {
            const height = 25; const baseRad = 8;
            for(let x=-baseRad+1; x<baseRad; x++){ for(let z=-baseRad+1; z<baseRad; z++){ if(Math.sqrt(x*x+z*z) < baseRad-1) addVoxel('water', cx+x, 1, cz+z, 'tower'); } }
            const topRad = 5; const midRad = 4;
            for(let y=0; y<height; y++) {
                let t = y / height; let r = Math.round(baseRad * (1-t)*(1-t) + midRad * 2 * t * (1-t) + topRad * t * t);
                for(let x = -r; x <= r; x++) {
                    for(let z = -r; z <= r; z++) {
                        if (cutaway && z > 0) continue;
                        const dist = Math.sqrt(x*x + z*z);
                        if (dist >= r - 1 && dist <= r) {
                             let type = 'concrete'; if(y > height - 3 && (x+z)%2===0) type = 'warning'; addVoxel(type, cx+x, y+1, cz+z, 'tower');
                        }
                    }
                }
            }
        }

        const generateEnvironment = () => {
            // Terrain
            for(let x=-50; x<50; x+=1) {
                for(let z=-50; z<50; z+=1) {
                    const dist = Math.sqrt(x*x + z*z);
                    if (dist < 35) { addVoxel('concrete', x, 0, z); } 
                    else { addVoxel(Math.random()>0.8 ? 'dirt' : 'grass', x, 0, z); }
                }
            }
            // Pipes
            for(let x=8; x<18; x++) addVoxel('darkConcrete', x, 4, 0);
            
            // Substation
            const cx = 28, cz = -15;
            for(let x=0; x<6; x++) for(let z=0; z<8; z++) addVoxel('concrete', cx+x, 1, cz+z);
            for(let i=0; i<3; i++) { 
                addVoxel('transformer', cx+1, 2, cz+1 + i*2); 
                addVoxel('copper', cx+1, 3, cz+1 + i*2); 
            }
        };

        generateEnvironment();
        generateReactorDome(0, 0);
        generateCoolingTower(-20, 15);
        generateCoolingTower(-20, -15);

        // Build Meshes
        const instances: Record<string, {count: number, data: any[]}> = {}; 
        voxelData.forEach(v => { 
            if(!instances[v.type]) instances[v.type] = { count: 0, data: [] }; 
            instances[v.type].count++; 
            instances[v.type].data.push(v); 
        });

        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const matrix = new THREE.Matrix4();
        const colorWhite = new THREE.Color(0xffffff);

        Object.keys(instances).forEach(key => {
            const entry = instances[key]; 
            const mat = materialsRef.current[key] || materialsRef.current.concrete;
            const mesh = new THREE.InstancedMesh(geometry, mat, entry.count);
            mesh.castShadow = true; 
            mesh.receiveShadow = true;
            
            for(let i=0; i<entry.count; i++) {
                const v = entry.data[i]; 
                matrix.setPosition(v.x, v.y, v.z); 
                mesh.setMatrixAt(i, matrix); 
                mesh.setColorAt(i, colorWhite); 
            }
            scene.add(mesh); 
            meshesRef.current.push(mesh);
        });

    }, [cutaway]);

    return <div ref={containerRef} className="absolute inset-0 z-0 pointer-events-none" />;
};

export default Scene3D;
