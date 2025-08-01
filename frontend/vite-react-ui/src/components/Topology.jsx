import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';

const ICON_SIZE = 30;

const Topology = ({ data }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (data.nodes.length === 0) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // === Load Icon Images ===
    const iconPaths = {
      vm: '/icons/vm.png',
      router: '/icons/router.png',
      server: '/icons/server.png',
      tower: '/icons/tower.png', // ✅ new tower icon
      default: '/icons/default.png',
    };

    const icons = {};
    let loadedIcons = 0;

    const nodeTypes = [...new Set(data.nodes.map(n => n.type || 'default'))];

    nodeTypes.forEach(type => {
      const img = new Image();
      img.src = iconPaths[type] || iconPaths.default;
      img.onload = () => {
        icons[type] = img;
        loadedIcons++;
        if (loadedIcons === nodeTypes.length) {
          startSimulation();
        }
      };
    });

    const startSimulation = () => {
      const simulation = d3.forceSimulation(data.nodes)
        .force("link", d3.forceLink(data.links).id(d => d.id).distance(120))
        .force("charge", d3.forceManyBody().strength(-300))
        .force("center", d3.forceCenter(width / 2, height / 2));

      let transform = d3.zoomIdentity;

      const draw = () => {
        context.save();
        context.clearRect(0, 0, width, height);
        context.translate(transform.x, transform.y);
        context.scale(transform.k, transform.k);

        // Draw links
        context.strokeStyle = "#ccc";
        context.lineWidth = 1.5;
        data.links.forEach(link => {
          if (link.source && link.target) {
            context.beginPath();
            context.moveTo(link.source.x, link.source.y);
            context.lineTo(link.target.x, link.target.y);
            context.stroke();
          }
        });

        // Draw nodes with icons
        data.nodes.forEach(node => {
          const icon = icons[node.type] || icons.default;
          const x = node.x - ICON_SIZE / 2;
          const y = node.y - ICON_SIZE / 2;
          context.drawImage(icon, x, y, ICON_SIZE, ICON_SIZE);

          // Optional: Draw label
          if (node.label) {
            context.font = '12px sans-serif';
            context.fillStyle = '#000';
            context.fillText(node.label, node.x + ICON_SIZE / 2 + 2, node.y + 4);
          }
        });

        context.restore();
      };

      simulation.on("tick", draw);

      // Zoom behavior
      d3.select(canvas)
        .call(d3.zoom()
          .scaleExtent([0.3, 8])
          .on("zoom", event => {
            transform = event.transform;
            draw();
          }));

      // Drag behavior
      d3.select(canvas)
        .call(d3.drag()
          .subject(event => {
            const [mx, my] = d3.pointer(event);
            const inverted = transform.invert([mx, my]);
            for (const node of data.nodes) {
              const dx = inverted[0] - node.x;
              const dy = inverted[1] - node.y;
              if (dx * dx + dy * dy < ICON_SIZE * ICON_SIZE / 4) {
                return node;
              }
            }
          })
          .on("start", event => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            event.subject.fx = event.subject.x;
            event.subject.fy = event.subject.y;
          })
          .on("drag", event => {
            event.subject.fx = event.x;
            event.subject.fy = event.y;
          })
          .on("end", event => {
            if (!event.active) simulation.alphaTarget(0);
            event.subject.fx = null;
            event.subject.fy = null;
          }));
    };
  }, [data]);

  return (
    <div style={{ width: '100%', height: 'calc(100vh - 100px)' }}>
      <canvas ref={canvasRef} width={window.innerWidth} height={window.innerHeight - 100}></canvas>
    </div>
  );
};

export default Topology;
