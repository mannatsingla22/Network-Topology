import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';

const Topology = ({ data }) => {
    const canvasRef = useRef(null);

    useEffect(() => {
        if (data.nodes.length === 0) return;

        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        // --- D3 Simulation Setup ---
        const simulation = d3.forceSimulation(data.nodes)
            .force("link", d3.forceLink(data.links).id(d => d.id).distance(100))
            .force("charge", d3.forceManyBody().strength(-200))
            .force("center", d3.forceCenter(width / 2, height / 2));

        // --- Drawing Function ---
        // This function will be called on each simulation "tick" and zoom/pan event.
        const draw = (transform) => {
            context.save();
            context.clearRect(0, 0, width, height);
            context.translate(transform.x, transform.y);
            context.scale(transform.k, transform.k);

            // Draw links
            context.strokeStyle = "#999";
            context.lineWidth = 1.5;
            data.links.forEach(link => {
                context.beginPath();
                // Ensure link source and target are resolved objects
                if (link.source && link.target) {
                    context.moveTo(link.source.x, link.source.y);
                    context.lineTo(link.target.x, link.target.y);
                }
                context.stroke();
            });

            // Draw nodes
            data.nodes.forEach(node => {
                context.beginPath();
                context.arc(node.x, node.y, 10, 0, 2 * Math.PI);
                context.fillStyle = node.type === 'vm' ? "steelblue" : "orange";
                context.fill();
                context.strokeStyle = "#fff";
                context.stroke();
            });
            
            context.restore();
        };
        
        // --- Initial Draw with Identity Transform ---
        let transform = d3.zoomIdentity;
        simulation.on("tick", () => draw(transform));

        // --- Zoom and Pan Implementation ---
        const zoom = d3.zoom()
            .scaleExtent([0.5, 8]) // Set min and max zoom levels
            .on("zoom", (event) => {
                transform = event.transform; // Update the transform on zoom/pan
                draw(transform); // Redraw the scene with the new transform
            });

        // Apply the zoom behavior to the canvas
        d3.select(canvas).call(zoom);
        
        // --- Dragging Implementation ---
        // This allows users to click and drag nodes
        d3.select(canvas).call(d3.drag()
            .subject((event) => {
                const [mx, my] = d3.pointer(event);
                const inverted = transform.invert([mx, my]);
                for (const node of data.nodes) {
                    const dx = inverted[0] - node.x;
                    const dy = inverted[1] - node.y;
                    if (dx * dx + dy * dy < 10 * 10) { // Check if mouse is over a node (radius 10)
                        return node;
                    }
                }
            })
            .on("start", (event) => {
                if (!event.active) simulation.alphaTarget(0.3).restart();
                event.subject.fx = event.subject.x;
                event.subject.fy = event.subject.y;
            })
            .on("drag", (event) => {
                event.subject.fx = event.x;
                event.subject.fy = event.y;
            })
            .on("end", (event) => {
                if (!event.active) simulation.alphaTarget(0);
                event.subject.fx = null;
                event.subject.fy = null;
            }));


    }, [data]);

    return (
        <div style={{ width: '100%', height: 'calc(100vh - 100px)'}}>
            <canvas ref={canvasRef} width={window.innerWidth} height={window.innerHeight - 100}></canvas>
        </div>
    );
};

export default Topology;
