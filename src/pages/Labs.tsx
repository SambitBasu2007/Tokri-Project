import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { inr } from '../lib/format';
import styles from './Labs.module.css';
import common from './common.module.css';

function ClothCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    context.scale(dpr, dpr);

    const cols = 16;
    const rows = 9;
    const gapX = width / (cols + 1);
    const gapY = (height - 20) / (rows + 1);
    type Point = { x: number; y: number; px: number; py: number; pinned: boolean };
    const points: Point[][] = [];

    for (let row = 0; row < rows; row += 1) {
      const line: Point[] = [];
      for (let col = 0; col < cols; col += 1) {
        const x = gapX * (col + 1);
        const y = 20 + gapY * (row + 1);
        line.push({ x, y, px: x, py: y, pinned: row === 0 });
      }
      points.push(line);
    }

    let frame = 0;
    let raf = 0;

    const draw = () => {
      context.clearRect(0, 0, width, height);
      const style = getComputedStyle(document.documentElement);
      context.strokeStyle = style.getPropertyValue('--ink-3').trim() || '#8a8a8a';
      context.lineWidth = 1;

      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
          if (col < cols - 1) {
            context.beginPath();
            context.moveTo(points[row][col].x, points[row][col].y);
            context.lineTo(points[row][col + 1].x, points[row][col + 1].y);
            context.stroke();
          }
          if (row < rows - 1) {
            context.beginPath();
            context.moveTo(points[row][col].x, points[row][col].y);
            context.lineTo(points[row + 1][col].x, points[row + 1][col].y);
            context.stroke();
          }
        }
      }
    };

    const simulate = () => {
      frame += 1;
      const gravity = 0.35;
      for (let row = 1; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
          const point = points[row][col];
          if (point.pinned) continue;
          const vx = (point.x - point.px) * 0.98;
          const vy = (point.y - point.py) * 0.98;
          point.px = point.x;
          point.py = point.y;
          const wind = Math.sin((frame + row * 3 + col) * 0.03) * 0.18;
          point.x += vx + wind;
          point.y += vy + gravity;
        }
      }
      for (let pass = 0; pass < 3; pass += 1) {
        for (let row = 0; row < rows; row += 1) {
          for (let col = 0; col < cols; col += 1) {
            if (col < cols - 1) {
              const a = points[row][col];
              const b = points[row][col + 1];
              const dx = b.x - a.x;
              const dy = b.y - a.y;
              const distance = Math.hypot(dx, dy) || 1;
              const difference = (distance - gapX) / distance / 2;
              a.x += dx * difference;
              a.y += dy * difference;
              b.x -= dx * difference;
              b.y -= dy * difference;
            }
            if (row < rows - 1) {
              const a = points[row][col];
              const b = points[row + 1][col];
              const dx = b.x - a.x;
              const dy = b.y - a.y;
              const distance = Math.hypot(dx, dy) || 1;
              const difference = (distance - gapY) / distance / 2;
              a.x += dx * difference;
              a.y += dy * difference;
              b.x -= dx * difference;
              b.y -= dy * difference;
            }
          }
        }
      }
      draw();
      raf = window.requestAnimationFrame(simulate);
    };

    if (reduceMotion) {
      draw();
      return () => window.cancelAnimationFrame(raf);
    }
    raf = window.requestAnimationFrame(simulate);
    return () => window.cancelAnimationFrame(raf);
  }, []);

  return <canvas ref={canvasRef} className={styles.canvas} aria-label="Decorative cloth simulation" />;
}

export default function LabsPage() {
  const [savings, setSavings] = useState(0);
  const [run, setRun] = useState(0);

  useEffect(() => {
    let frame = 0;
    const target = 1240;
    let raf = 0;
    const step = () => {
      frame += 1;
      const progress = Math.min(1, frame / 45);
      setSavings(Math.round(target * (1 - (1 - progress) ** 3)));
      if (progress < 1) raf = window.requestAnimationFrame(step);
    };
    raf = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(raf);
  }, [run]);

  return (
    <div className="page">
      <div className="container">
        <div className={common.pageHead}>
          <div>
            <h1>Labs</h1>
            <p className={common.lede}>
              Decorative experiments live here now, off the catalog page. They are intentionally not
              part of the shopping flow.
            </p>
          </div>
          <Link className="btn btn-sm" to="/">
            Back to catalog
          </Link>
        </div>

        <div className={common.split}>
          <section className={common.panel}>
            <div className={common.panelHead}>
              <h2 className={common.panelTitle}>Cloth simulation</h2>
              <span className={common.panelMeta}>Canvas 2D · decorative</span>
            </div>
            <ClothCanvas />
            <p className={common.smallNote}>
              A verlet-integration cloth, pinned along the top edge. It used to sit on the home
              page; it slowed the first screen and added nothing to price comparison.
            </p>
          </section>

          <section className={common.panel}>
            <div className={common.panelHead}>
              <h2 className={common.panelTitle}>Savings counter</h2>
              <span className={common.panelMeta}>Illustrative only</span>
            </div>
            <p className={styles.amount}>{inr(savings)}</p>
            <p className={common.smallNote}>
              This number is an animation, not a measurement. Tokri does not claim savings without a
              real basket.
            </p>
            <div className={common.actions} style={{ marginTop: '12px' }}>
              <button type="button" className="btn btn-sm" onClick={() => { setSavings(0); setRun((value) => value + 1); }}>
                Replay animation
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
