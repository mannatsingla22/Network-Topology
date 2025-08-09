import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

// --- Icon Asset Management ---
const icons = {
  default: '/icons/default.png',
  router: '/icons/router.png',
  server: '/icons/server.png',
  tower: '/icons/tower.png',
  vm: '/icons/vm.png',
  subnet: '/icons/b_5cd83af5abb62.svg'
};

const TopologyVisualization = ({ data }) => {
  const canvasRef = useRef(null);
  const tooltipRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const imageCache = useRef(new Map());

  // Preload images for the visualization
  useEffect(() => {
    let loadedCount = 0;
    const totalImages = Object.values(icons).length;
    
    const onImageLoad = () => {
        loadedCount++;
        if (loadedCount === totalImages) {
            // Force a re-render once all images are loaded to ensure they are drawn
            setDimensions(dims => ({...dims})); 
        }
    };

    Object.entries(icons).forEach(([key, src]) => {
      if (!imageCache.current.has(src)) {
        const img = new Image();
        img.src = src;
        img.onload = () => {
          imageCache.current.set(src, img);
          onImageLoad();
        };
        img.onerror = () => {
            console.error(`Failed to load icon: ${src}`);
            onImageLoad(); // Still count it as "loaded" to not block rendering
        }
      } else {
        onImageLoad();
      }
    });
  }, []);

  // This effect handles resizing the canvas to fit its container
  useEffect(() => {
    const canvas = canvasRef.current;
    const resizeObserver = new ResizeObserver(entries => {
      if (entries && entries.length > 0) {
        const { width, height } = entries[0].contentRect;
        setDimensions({ width, height });
      }
    });
    resizeObserver.observe(canvas.parentElement);
    return () => resizeObserver.disconnect();
  }, []);

  // This is the core D3 effect for drawing and updating the graph
  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (!data || data.nodes.length === 0 || dimensions.width === 0) {
        context.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas if no data
        return;
    };

    canvas.width = dimensions.width;
    canvas.height = dimensions.height;

    const nodes = data.nodes.map(d => ({ ...d }));
    const links = data.links.map(d => ({ ...d }));

    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(120).strength(0.6))
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(canvas.width / 2, canvas.height / 2))
      .force('x', d3.forceX(canvas.width / 2).strength(0.05))
      .force('y', d3.forceY(canvas.height / 2).strength(0.05));

    const draw = (transform) => {
      context.save();
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.translate(transform.x, transform.y);
      context.scale(transform.k, transform.k);

      context.strokeStyle = '#999';
      context.lineWidth = 1.5 / transform.k;
      links.forEach(d => {
        context.beginPath();
        context.moveTo(d.source.x, d.source.y);
        context.lineTo(d.target.x, d.target.y);
        context.stroke();
      });
      
      const iconSize = 32 / transform.k;
      nodes.forEach(node => {
        const iconKey = node.type === 'subnet' ? 'subnet' : 'default';
        const img = imageCache.current.get(icons[iconKey]);
        if (img && img.complete) {
            context.drawImage(img, node.x - iconSize / 2, node.y - iconSize / 2, iconSize, iconSize);
        } else {
            context.beginPath();
            context.arc(node.x, node.y, 10 / transform.k, 0, 2 * Math.PI);
            context.fillStyle = node.type === 'subnet' ? '#f59e0b' : '#3b82f6';
            context.fill();
        }
      });
      
      context.fillStyle = '#333';
      context.font = `${10 / transform.k}px sans-serif`;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      nodes.forEach(node => {
        context.fillText(node.id, node.x, node.y + (iconSize / 2) + 8 / transform.k);
      });

      context.restore();
    };

    let transform = d3.zoomIdentity;
    simulation.on('tick', () => draw(transform));

    const zoom = d3.zoom()
      .scaleExtent([0.2, 8])
      .on('zoom', (event) => {
        transform = event.transform;
        draw(transform);
      });

    d3.select(canvas).call(zoom);

    const drag = d3.drag()
        .subject((event) => {
            const [mx, my] = d3.pointer(event, canvas);
            const t = transform.invert([mx, my]);
            let closest = null;
            let minDist = Infinity;
            for (const node of nodes) {
                const dist = Math.hypot(t[0] - node.x, t[1] - node.y);
                if (dist < minDist) {
                    minDist = dist;
                    closest = node;
                }
            }
            if (minDist < 20 / transform.k) {
                return closest;
            }
        })
        .on('start', (event) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            event.subject.fx = event.subject.x;
            event.subject.fy = event.subject.y;
        })
        .on('drag', (event) => {
            event.subject.fx = event.x;
            event.subject.fy = event.y;
        })
        .on('end', (event) => {
            if (!event.active) simulation.alphaTarget(0);
            event.subject.fx = null;
            event.subject.fy = null;
        });

    d3.select(canvas).call(drag);

    const tooltip = d3.select(tooltipRef.current);
    
    const handleMouseMove = (event) => {
        const [mx, my] = d3.pointer(event);
        const t = transform.invert([mx, my]);
        let foundNode = null;
        for (const node of nodes) {
            const dist = Math.hypot(t[0] - node.x, t[1] - node.y);
            if (dist < 16 / transform.k) {
                foundNode = node;
                break;
            }
        }
        
        if (foundNode) {
            const openPorts = foundNode.open_ports?.join(', ') || 'N/A';
            tooltip.style('opacity', 1)
                   .style('left', `${event.pageX + 15}px`)
                   .style('top', `${event.pageY - 10}px`)
                   .html(`<strong>IP:</strong> ${foundNode.id}<br/><strong>Type:</strong> ${foundNode.type}<br/><strong>Ports:</strong> ${openPorts}`);
        } else {
            tooltip.style('opacity', 0);
        }
    };

    d3.select(canvas).on('mousemove', handleMouseMove);
    d3.select(canvas).on('mouseout', () => tooltip.style('opacity', 0));

    return () => {
      simulation.stop();
      d3.select(canvas).on('.zoom', null).on('.drag', null).on('mousemove', null).on('mouseout', null);
    };
  }, [data, dimensions]);

  return (
    <div className="w-full h-full relative bg-gray-100 rounded-lg border border-gray-300">
      <canvas ref={canvasRef} className="w-full h-full"></canvas>
      <div
        ref={tooltipRef}
        className="absolute opacity-0 pointer-events-none bg-white text-gray-800 text-sm p-2 rounded-lg shadow-lg border border-gray-200 transition-opacity duration-200"
      ></div>
    </div>
  );
};

export default TopologyVisualization;
