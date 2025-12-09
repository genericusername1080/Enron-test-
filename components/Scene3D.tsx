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
    const steamParticlesRef = useRef<any[]>([]);
    
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
        controls.maxDistance = 250;
        controls.target.set(0, 5, 0);

        // Post Processing
        const renderScene = new RenderPass(scene, camera);
        const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
        bloomPass.threshold = 0.2;
        bloomPass.strength = 1.2;
        bloomPass.radius = 0.5;

        const composer = new EffectComposer(renderer);
        composer.addPass(renderScene);
        composer.addPass(bloomPass);
        composerRef.current = composer;

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        scene.add(ambientLight);
        const sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
        sunLight.position.set(60, 100, 40);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 2048;
        sunLight.shadow.mapSize.height = 2048;
        scene.add(sunLight);

        // Materials
        materialsRef.current = {
            grass: new THREE.MeshStandardMaterial({ color: 0x4caf50, roughness: 1, metalness: 0 }),
            dirt: new THREE.MeshStandardMaterial({ color: 0x795548, roughness: 1 }),
            concrete: new THREE.MeshStandardMaterial({ color: 0x90a4ae, roughness: 0.8 }),
            darkConcrete: new THREE.MeshStandardMaterial({ color: 0x546e7a, roughness: 0.8 }),
            water: new THREE.MeshStandardMaterial({ color: 0x29b6f6, transparent: true, opacity: 0.7, roughness: 0.2, metalness: 0.1 }),
            steel: new THREE.MeshStandardMaterial({ color: 0xb0bec5, roughness: 0.3, metalness: 0.8 }),
            glass: new THREE.MeshStandardMaterial({ color: 0x88ccff, roughness: 0.0, metalness: 0.9, transparent: true, opacity: 0.8 }),
            warning: new THREE.MeshStandardMaterial({ color: 0xffc107 }),
            steam: new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.4 }),
            glow: new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 2.0 }),
            coreBlue: new THREE.MeshStandardMaterial({ color: 0x0088ff, emissive: 0x0088ff, emissiveIntensity: 3.0 }),
            redControl: new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 0.5 }),
            transformer: new THREE.MeshStandardMaterial({ color: 0x263238 }),
            fire: new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0xff5500, emissiveIntensity: 4.0 }),
            building_window_on: new THREE.MeshStandardMaterial({ color: 0xffeb3b, emissive: 0xffaa00, emissiveIntensity: 2.0 }),
            street_light: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1.5 }),
            enron_logo: new THREE.MeshStandardMaterial({ color: 0xeeeeee, emissive: 0x2980b9, emissiveIntensity: 2.0 })
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

            if(sceneRef.current) sceneRef.current.background = bgColor;
            sunLight.intensity = sunInt;
            ambientLight.intensity = ambInt;
            
            materialsRef.current.building_window_on.emissiveIntensity = cityLights * 3.0;
            materialsRef.current.street_light.emissiveIntensity = cityLights * 2.0;

            // Core Glow
            const temp = state.temp;
            const color = new THREE.Color(); 
            const emissive = new THREE.Color();
            if(temp < 1000) { 
                const t = (temp - 300) / 700; 
                color.setHSL(0.6 - t*0.3, 1.0, 0.5); 
                emissive.setHSL(0.6 - t*0.3, 1.0, 0.5 + t); 
            } else { 
                const t = (temp - 1000) / 1000; 
                color.setHSL(0.3 - t*0.25, 1.0, 0.5); 
                emissive.setHSL(0.3 - t*0.25, 1.0, 1.5 + t); 
            }
            materialsRef.current.glow.color.copy(color);
            materialsRef.current.glow.emissive.copy(emissive);

            // Particles
            steamParticlesRef.current.forEach(p => {
                p.mesh.position.y += p.speed; p.time += 0.02;
                p.mesh.position.x = p.initialX + Math.sin(p.time) * 1.5;
                p.mesh.position.z = p.initialZ + Math.cos(p.time) * 1.5;
                if(p.mesh.position.y > 45) { p.mesh.position.y = 26; }
            });

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

    // Rebuild World on Cutaway Toggle or Significant Growth
    useEffect(() => {
        if (!sceneRef.current) return;
        const scene = sceneRef.current;
        
        meshesRef.current.forEach(mesh => { scene.remove(mesh); mesh.geometry.dispose(); });
        meshesRef.current = [];

        const voxelData: any[] = [];
        const addVoxel = (type: string, x: number, y: number, z: number) => {
            voxelData.push({ type, x, y, z });
        };

        const generateReactorDome = (cx: number, cz: number) => {
            const radius = 10; const height = 16;
            for(let y=0; y<8; y++) {
                for(let x=-2; x<=2; x++) {
                    for(let z=-2; z<=2; z++) {
                        if(x*x + z*z <= 4.5) {
                            const isRod = (x+z)%2 !== 0;
                             if (y > 1 && y < 6 && isRod) addVoxel('glow', cx+x, y+1, cz+z);
                             else if (y >= 6 && y < 8 && isRod) addVoxel('redControl', cx+x, y+1, cz+z);
                             else addVoxel('steel', cx+x, y+1, cz+z);
                        }
                    }
                }
            }
            for(let x=-1; x<=1; x++) for(let z=-1; z<=1; z++) addVoxel('coreBlue', cx+x, 2, cz+z);
            for(let y=0; y<height; y++) {
                for(let x=-radius; x<=radius; x++) {
                    for(let z=-radius; z<=radius; z++) {
                        if (cutaway && z > 0) continue;
                        const dist = Math.sqrt(x*x + z*z);
                        if (y < 10) { if(dist > radius - 1.5 && dist <= radius) addVoxel('concrete', cx+x, y+1, cz+z); } 
                        else { 
                            const domeY = y - 10; const domeRad = Math.sqrt(radius*radius - domeY*domeY); 
                            if (dist > domeRad - 1.5 && dist <= domeRad) addVoxel('concrete', cx+x, y+1, cz+z); 
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

        const generateSkyscraper = (cx: number, cz: number, h: number, w: number) => {
            for(let y=0; y<h; y++) {
                for(let x=-w; x<=w; x++) {
                    for(let z=-w; z<=w; z++) {
                         if(x===-w || x===w || z===-w || z===w) {
                            const isWindow = (y % 3 !== 0) && (x+z)%2 !== 0;
                            addVoxel(isWindow ? 'glass' : 'steel', cx+x, y+1, cz+z);
                            if (isWindow && Math.random() > 0.6) addVoxel('building_window_on', cx+x, y+1, cz+z);
                         } else if (y===h-1) {
                            addVoxel('concrete', cx+x, y+1, cz+z);
                         }
                    }
                }
            }
        };

        const generateCoolingTower = (cx: number, cz: number) => {
            const height = 25; const baseRad = 8;
            for(let x=-baseRad+1; x<baseRad; x++){ for(let z=-baseRad+1; z<baseRad; z++){ if(Math.sqrt(x*x+z*z) < baseRad-1) addVoxel('water', cx+x, 1, cz+z); } }
            const topRad = 5; const midRad = 4;
            for(let y=0; y<height; y++) {
                let t = y / height; let r = Math.round(baseRad * (1-t)*(1-t) + midRad * 2 * t * (1-t) + topRad * t * t);
                for(let x = -r; x <= r; x++) {
                    for(let z = -r; z <= r; z++) {
                        if (cutaway && z > 0) continue;
                        const dist = Math.sqrt(x*x + z*z);
                        if (dist >= r - 1 && dist <= r) {
                             let type = 'concrete'; if(y > height - 3 && (x+z)%2===0) type = 'warning'; addVoxel(type, cx+x, y+1, cz+z);
                        }
                    }
                }
            }
        }

        // Dynamic City Growth based on Stock Price
        const score = gameState.current.score;
        
        generateReactorDome(0, 0);
        generateCoolingTower(-20, 15);
        generateCoolingTower(-20, -15);
        
        // Initial Office (Small)
        generateSkyscraper(25, 15, 12, 4);

        // Expansion 1: Enron South
        if (score > 60) {
            generateSkyscraper(25, -15, 20, 5);
        }
        // Expansion 2: The New Tower
        if (score > 80) {
             generateSkyscraper(40, 0, 35, 6);
             // Skybridge
             for(let x=30; x<34; x++) addVoxel('glass', x, 15, 0);
        }
        // Expansion 3: Mega Corp
        if (score > 100) {
            generateSkyscraper(40, 20, 25, 4);
            generateSkyscraper(40, -20, 25, 4);
        }
        // Expansion 4: The Sprawl
        if (score > 150) {
            generateSkyscraper(60, 10, 30, 5);
            generateSkyscraper(60, -10, 30, 5);
            generateSkyscraper(60, 40, 15, 4);
        }
        // Expansion 5: Dominance
        if (score > 200) {
            generateSkyscraper(50, 50, 40, 6);
            generateSkyscraper(50, -50, 40, 6);
        }

        // Terrain
        for(let x=-60; x<60; x+=1) {
            for(let z=-60; z<60; z+=1) {
                const dist = Math.sqrt(x*x + z*z);
                if (dist < 35) addVoxel('concrete', x, 0, z);
                else addVoxel(Math.random()>0.8 ? 'dirt' : 'grass', x, 0, z);
            }
        }

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

    }, [cutaway, gameState.current.score]); // Re-render when score changes significantly

    return <div ref={containerRef} className="absolute inset-0 z-0 pointer-events-none" />;
};

export default Scene3D;