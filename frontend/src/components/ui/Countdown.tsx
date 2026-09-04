import React, { useState, useEffect, useRef } from 'react';

interface CountdownProps {
  expiresAt?: string | number | Date | null;
  targetSeconds?: number;
  initialSeconds?: number;
  onExpire?: () => void;
  className?: string;
  label?: string;
}

export const Countdown: React.FC<CountdownProps> = ({
  expiresAt,
  targetSeconds,
  initialSeconds = 600,
  onExpire,
  className = '',
  label,
}) => {
  const onExpireRef = useRef(onExpire);
  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  const calculateRemaining = (): number => {
    if (expiresAt) {
      const targetMs = new Date(expiresAt).getTime();
      if (!isNaN(targetMs)) {
        return Math.max(0, Math.floor((targetMs - Date.now()) / 1000));
      }
    }
    return targetSeconds !== undefined ? targetSeconds : initialSeconds;
  };

  const [secondsRemaining, setSecondsRemaining] = useState<number>(calculateRemaining);

  useEffect(() => {
    setSecondsRemaining(calculateRemaining());
  }, [expiresAt, targetSeconds]);

  useEffect(() => {
    const updateTimer = () => {
      const remaining = calculateRemaining();
      setSecondsRemaining(remaining);
      if (remaining <= 0) {
        onExpireRef.current?.();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

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
