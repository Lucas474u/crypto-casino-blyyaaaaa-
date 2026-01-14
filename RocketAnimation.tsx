import React, { useEffect, useRef } from 'react';
import './RocketAnimation.css';

const RocketAnimation: React.FC = () => {
  const rocketRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const rocket = rocketRef.current;
    if (!rocket) return;

    const animate = () => {
      let position = -200;
      const speed = 2;

      const moveRocket = () => {
        position += speed;
        if (position > window.innerWidth + 200) {
          position = -200;
        }
        
        if (rocket) {
          const yOffset = Math.sin(position * 0.01) * 50;
          rocket.style.left = `${position}px`;
          rocket.style.top = `calc(50% + ${yOffset}px)`;
          rocket.style.transform = `rotate(${Math.sin(position * 0.005) * 10}deg)`;
        }
        
        requestAnimationFrame(moveRocket);
      };

      moveRocket();
    };

    animate();
  }, []);

  return (
    <div className="rocket-container">
      <div ref={rocketRef} className="rocket">
        <div className="rocket-body">
          <div className="rocket-window"></div>
        </div>
        <div className="rocket-fins">
          <div className="fin left-fin"></div>
          <div className="fin right-fin"></div>
        </div>
        <div className="rocket-flame">
          <div className="flame"></div>
        </div>
      </div>
      <div className="stars">
        {Array.from({ length: 50 }).map((_, i) => (
          <div 
            key={i} 
            className="star" 
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`
            }}
          ></div>
        ))}
      </div>
    </div>
  );
};

export default RocketAnimation;
