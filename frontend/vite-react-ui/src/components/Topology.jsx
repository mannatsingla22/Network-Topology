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

        const simulation = d3.forceSimulation(data.nodes)
            .force("link", d3.forceLink(data.links).id(d => d.id).distance(100))
            .force("charge", d3.forceManyBody().strength(-200))
            .force("center", d3.forceCenter(width / 2, height / 2));

        const draw = () => {
            context.clearRect(0, 0, width, height);

            // Draw links
            context.strokeStyle = "#999";
            context.lineWidth = 1.5;
            data.links.forEach(link => {
                context.beginPath();
                context.moveTo(link.source.x, link.source.y);
                context.lineTo(link.target.x, link.target.y);
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
        };

        simulation.on("tick", draw);

    }, [data]);

    return (
        <div style={{ width: '100%', height: 'calc(100vh - 100px)'}}>
            <canvas ref={canvasRef} width={window.innerWidth} height={window.innerHeight - 100}></canvas>
        </div>
    );
};

export default Topology;