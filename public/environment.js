/* Approved CrowdClear concourse: shared materials and lightweight, metre-scale geometry. */
(function () {
  const AFRAME = window.AFRAME;
  const box = (position, size, material) => `<a-box position="${position}" width="${size[0]}" height="${size[1]}" depth="${size[2]}" material="${material}"></a-box>`;
  const metal = 'color: #9aa8b3; metalness: 0.55; roughness: 0.55';
  const navy = 'color: #213349; roughness: 0.85';

  AFRAME.registerComponent('concourse', {
    init() {
      let html = `<a-plane rotation="-90 0 0" width="24" height="24" material="src: #floor-material; repeat: 6 6; roughness: 0.95"></a-plane>`;
      // Leave real openings behind the three doors; a continuous wall would hide the exterior.
      for (const [x, width] of [[-10.8, 2.4], [-4, 4.8], [4, 4.8], [10.8, 2.4]]) {
        html += box(`${x} 1.75 -12`, [width, 3.5, 0.3], `src: #wall-material; repeat: ${width / 3} 1; roughness: 0.95`);
        html += box(`${x} 0.5 -11.82`, [width, 1, 0.04], navy);
        html += box(`${x} 2.4 -11.79`, [0.16, 0.55, 0.1], 'shader: flat; color: #fff3d4');
      }
      html += box('0 2.92 -12', [24, 1.16, 0.3], 'src: #wall-material; repeat: 8 0.4; roughness: 0.95');
      html += box('0 3.5 -11.8', [24, 0.12, 0.12], navy);
      for (const x of [-12, 12]) {
        html += box(`${x} 1.75 0`, [0.3, 3.5, 24], 'src: #wall-material; repeat: 8 1; roughness: 0.95');
        html += box(`${x > 0 ? 11.82 : -11.82} 0.5 0`, [0.04, 1, 24], navy);
        html += box(`${x} 3.5 0`, [0.45, 0.12, 24], navy);
      }
      html += `<a-entity position="-11.79 0 -1" rotation="0 90 0">
        <a-plane position="0 1.6 0" width="5" height="2" material="src: #shutter-material; roughness: 0.7; metalness: 0.3"></a-plane>
        ${box('0 0.64 0.18', [5.2, 0.12, 0.4], navy)}
        <a-text font="aileronsemibold" value="CONCOURSE" position="0 2.9 0.02" align="center" width="4" color="#eef3f8"></a-text>
      </a-entity>
      <a-plane position="11.79 2.1 -3" rotation="0 -90 0" width="3" height="1.88" material="src: #venue-map; shader: flat"></a-plane>
      <a-entity position="11.1 0 1" rotation="0 -90 0">
        ${box('0 0.48 0', [2.8, 0.1, 0.55], metal)}
        ${box('0 0.8 -0.24', [2.8, 0.35, 0.08], metal)}
        ${box('-1 0.24 0', [0.08, 0.48, 0.5], navy)}
        ${box('1 0.24 0', [0.08, 0.48, 0.5], navy)}
      </a-entity>
      ${box('11.1 0.5 4', [0.65, 1, 0.65], navy)}
      <a-plane position="11.1 1.005 4" rotation="-90 0 0" width="0.4" height="0.4" material="color: #080f17; shader: flat"></a-plane>`;
      this.el.innerHTML = html;
    }
  });

  AFRAME.registerComponent('stadium-door', {
    schema: { state: { default: 'closed' }, hovered: { default: false } },
    init() {
      const letter = this.el.id.slice(-1).toUpperCase();
      let html = box('-1.57 1.1 0', [0.14, 2.2, 0.24], metal)
        + box('1.57 1.1 0', [0.14, 2.2, 0.24], metal)
        + box('0 2.23 0', [3.28, 0.16, 0.24], metal);
      for (const [side, sign] of [['left', 1], ['right', -1]]) {
        html += `<a-entity class="${side}-hinge" position="${-sign * 1.5} 0 0"
          animation__open="property: rotation; to: 0 ${sign * 85} 0; dur: 350; startEvents: door-open; pauseEvents: door-close; easing: easeOutQuad"
          animation__close="property: rotation; to: 0 0 0; dur: 250; startEvents: door-close; pauseEvents: door-open; easing: easeOutQuad">
          ${box(`${sign * 0.75} 1.07 0`, [1.49, 2.14, 0.09], 'color: #24394e; metalness: 0.25; roughness: 0.7')}
          ${box(`${sign * 0.75} 1.58 0.06`, [0.56, 0.5, 0.04], metal)}
          <a-plane position="${sign * 0.75} 1.58 0.085" width="0.43" height="0.37" material="color: #8b9dac; roughness: 0.6"></a-plane>
          ${box(`${sign * 0.75} 0.92 0.12`, [1.05, 0.09, 0.1], metal)}
        </a-entity>`;
      }
      // shortcut: the exterior is a flat backdrop; use geometry if players can walk through doors.
      html += `${box('0 2.68 0', [2.2, 0.5, 0.12], 'color: #16834b; emissive: #2fbf71; emissiveIntensity: 0.4; roughness: 0.8')}
        <a-text font="aileronsemibold" value="EXIT ${letter}" position="0 2.68 0.07" width="2.1" wrap-count="12" align="center" color="#ffffff"></a-text>
        ${box('0 2.15 0.15', [2.3, 0.22, 0.06], navy)}
        <a-text font="aileronsemibold" class="door-status" position="0 2.15 0.19" width="2.1" wrap-count="18" align="center"></a-text>
        <a-box class="status-light" position="1.78 1.8 0.1" width="0.16" height="0.28" depth="0.1" material="shader: flat"></a-box>
        <a-plane position="0 1.25 -2.3" width="5.4" height="3.05" material="src: #exterior-material; shader: flat"></a-plane>
        <a-plane position="0 0 -1" rotation="-90 0 0" width="3.2" height="2.6" material="src: #floor-material; repeat: 0.8 0.65; roughness: 0.95"></a-plane>`;
      this.el.innerHTML = html;
      this.hinges = [...this.el.querySelectorAll('.left-hinge, .right-hinge')];
      this.status = this.el.querySelector('.door-status');
      this.light = this.el.querySelector('.status-light');
    },
    update(oldData) {
      const open = this.data.state === 'open';
      const blocked = this.data.state === 'blocked';
      const color = blocked ? '#ffd27d' : open ? '#2fbf71' : '#e5484d';
      this.status.setAttribute('value', blocked ? 'BLOCKED' : open ? 'OPEN' : 'CLOSED');
      this.status.setAttribute('color', color);
      this.light.setAttribute('material', 'color', this.data.hovered ? '#eef3f8' : color);
      if (oldData.state !== this.data.state) {
        this.hinges.forEach((hinge, i) => {
          if (oldData.state === undefined) hinge.setAttribute('rotation', `0 ${open ? (i ? -85 : 85) : 0} 0`);
          else hinge.emit(open ? 'door-open' : 'door-close');
        });
      }
    }
  });

  AFRAME.registerComponent('equipment-blockage', {
    schema: { outlined: { default: false } },
    init() {
      const caseMaterial = 'color: #273440; roughness: 0.8';
      let html = `<a-entity position="-0.55 0.4 0.15">
        ${box('0 0 0', [1.35, 0.8, 0.65], caseMaterial)}
        <a-plane position="0 0.31 0.331" width="1.35" height="0.13" material="src: #hazard-stripes; repeat: 4 1; roughness: 0.8"></a-plane>
        <a-plane position="0 -0.31 0.331" width="1.35" height="0.13" material="src: #hazard-stripes; repeat: 4 1; roughness: 0.8"></a-plane>
        ${box('0 0.05 0.37', [0.32, 0.06, 0.06], metal)}
      </a-entity>
      <a-entity position="0.85 0.55 0" rotation="0 -12 -22">
        ${box('0 0 0', [0.8, 0.9, 0.65], caseMaterial)}
        <a-plane position="0 0 0.331" width="0.8" height="0.17" material="src: #hazard-stripes; repeat: 3 1; roughness: 0.8"></a-plane>
        ${box('0 0.3 0.37', [0.28, 0.06, 0.06], metal)}
      </a-entity>`;
      html += box('-0.25 0.22 -0.45', [2.1, 0.08, 0.65], metal);
      for (const x of [-1.25, 0.75]) {
        html += box(`${x} 0.55 -0.72`, [0.07, 0.7, 0.07], metal);
        html += `<a-cylinder position="${x} 0.17 -0.4" radius="0.16" height="0.13" rotation="0 0 90" segments-radial="8" material="color: #101b28; roughness: 0.9"></a-cylinder>`;
      }
      html += box('-0.25 0.88 -0.72', [2.1, 0.07, 0.07], metal);
      // Invisible hit volume so laptop/VR can click the blockage itself (same clear action as the door).
      html += `<a-box class="vr-control block-hit" position="0 0.55 0" width="2.8" height="1.4" depth="1.6" material="visible: false"></a-box>`;
      // Red outline frame — toggled via outlined when this exit is blocking.
      const edge = 'shader: flat; color: #e5484d; emissive: #e5484d; emissiveIntensity: 0.55';
      html += `<a-entity class="block-outline" visible="false">
        ${box('0 1.25 0', [2.9, 0.05, 1.7], edge)}
        ${box('0 0.05 0', [2.9, 0.05, 1.7], edge)}
        ${box('-1.45 0.65 0', [0.05, 1.25, 1.7], edge)}
        ${box('1.45 0.65 0', [0.05, 1.25, 1.7], edge)}
        ${box('0 0.65 -0.85', [2.9, 1.25, 0.05], edge)}
        ${box('0 0.65 0.85', [2.9, 1.25, 0.05], edge)}
      </a-entity>`;
      this.el.innerHTML = html;
      this.outline = this.el.querySelector('.block-outline');
    },
    update() {
      this.outline?.setAttribute('visible', this.data.outlined);
    }
  });

  AFRAME.registerComponent('hazard-puffs', {
    schema: { ground: { default: false } },
    init() {
      const THREE = AFRAME.THREE;
      this.motion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
      this.texture = new THREE.TextureLoader().load('/textures/concourse/smoke.svg');
      const group = new THREE.Group();
      this.puffs = Array.from({ length: this.data.ground ? 3 : 5 }, () => {
        const puff = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.texture, color: '#424b55', transparent: true, depthWrite: false, opacity: 0 }));
        group.add(puff);
        return puff;
      });
      this.flames = [];
      if (this.data.ground) {
        this.flameTexture = new THREE.TextureLoader().load('/textures/concourse/flame.svg');
        this.flames = [-0.22, 0.22].map(x => {
          const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.flameTexture, transparent: true, depthWrite: false, opacity: 0.8 }));
          flame.position.set(x, 0.34, 0);
          flame.scale.set(0.36, 0.5, 1);
          group.add(flame);
          return flame;
        });
      }
      this.el.setObject3D('mesh', group);
    },
    tick(time) {
      if (!this.el.object3D.visible || this.el.object3D.parent?.visible === false) return;
      this.puffs.forEach((puff, i) => {
        const phase = this.motion?.matches ? 0.3 + i * 0.1 : ((time + i * 700) % 3800) / 3800;
        if (this.data.ground) {
          puff.position.set(Math.sin(i * 2.3) * 0.3 + phase * 0.08, 0.3 + phase * 0.2, 0.1);
          puff.scale.setScalar(0.35 + phase * 0.25);
        } else {
          puff.position.set(Math.sin(i * 2.3) * 0.38 + phase * 0.12, 0.7 + phase * 3, 0.1);
          puff.scale.setScalar(1.1 + phase * 1.3);
        }
        puff.material.opacity = Math.sin(phase * Math.PI) * (this.data.ground ? 0.3 : 0.45);
      });
      this.flames.forEach((flame, i) => {
        const sway = this.motion?.matches ? 0 : Math.sin(time / 1100 + i) * 0.03;
        flame.scale.set(0.36 + sway, 0.5 + sway, 1);
      });
    },
    remove() {
      [...this.puffs, ...this.flames].forEach(sprite => sprite.material.dispose());
      this.texture.dispose();
      this.flameTexture?.dispose();
      this.el.removeObject3D('mesh');
    }
  });
})();
