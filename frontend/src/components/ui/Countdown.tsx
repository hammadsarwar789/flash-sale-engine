import React, { useState, useEffect } from 'react';

interface CountdownProps {
  targetSeconds?: number;
  initialSeconds?: number;
  onExpire?: () => void;
  className?: string;
  label?: string;
}

export const Countdown: React.FC<CountdownProps> = ({
  targetSeconds,
  initialSeconds = 600,
  onExpire,
  className = '',
  label,
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(() => {
    return targetSeconds !== undefined ? targetSeconds : initialSeconds;
  });

  useEffect(() => {
    if (targetSeconds !== undefined) {
      setSecondsRemaining(targetSeconds);
    }
  }, [targetSeconds]);

  useEffect(() => {
    if (secondsRemaining <= 0) {
      onExpire?.();
      return;
    }

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onExpire?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsRemaining, onExpire]);

  const hours = Math.floor(secondsRemaining / 3600);
  const minutes = Math.floor((secondsRemaining % 3600) / 60);
  const seconds = secondsRemaining % 60;

  const formattedTime = hours > 0
    ? `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    : `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  const isUrgent = secondsRemaining > 0 && secondsRemaining <= 60;
  const isExpired = secondsRemaining === 0;

  let colorClass = 'text-text';
  if (isUrgent) {
    colorClass = 'text-amber animate-signal-pulse';
  } else if (isExpired) {
    colorClass = 'text-rose';
  }

  return (
    <div className={`inline-flex items-center gap-2 font-mono tabular-nums select-none ${className}`}>
      {label && <span className="text-text-mute text-xs uppercase tracking-wider">{label}</span>}
      <span className={`text-[15px] font-bold tracking-wider ${colorClass}`}>
        {formattedTime}
      </span>
    </div>
  );
};
