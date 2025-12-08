'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';

const MONTHS = [
  'January 2026', 'February 2026', 'March 2026', 'April 2026',
  'May 2026', 'June 2026', 'July 2026', 'August 2026',
  'September 2026', 'October 2026', 'November 2026'
];

// Switch assignments for first 3 months (lowercase for comparison)
const RIGGED_ASSIGNMENTS: { month: string; name: string }[] = [
  { month: 'January 2026', name: 'sujib lamsal' },
  { month: 'February 2026', name: 'sapna basnet' },
  { month: 'March 2026', name: 'bibhusan kc' },
];

const WHEEL_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
  '#F8B500', '#00CED1', '#FF69B4', '#32CD32', '#FF7F50'
];

export default function RosterPicker() {
  const [names, setNames] = useState<string[]>([]);
  const [newName, setNewName] = useState('');
  const [currentMonthIndex, setCurrentMonthIndex] = useState(0);
  const [assignments, setAssignments] = useState<{ month: string; person: string }[]>([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [started, setStarted] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [isSwitchEnabled, setIsSwitchEnabled] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  const animationRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const assignedNames = assignments.map(a => a.person);
  const availableNames = names.filter(name => !assignedNames.includes(name));

  // Create stable color mapping based on original name list
  const nameColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    names.forEach((name, index) => {
      map[name] = WHEEL_COLORS[index % WHEEL_COLORS.length];
    });
    return map;
  }, [names]);

  // Find name case-insensitively
  const findNameCaseInsensitive = useCallback((searchName: string, nameList: string[]): string | null => {
    const lowerSearch = searchName.toLowerCase();
    return nameList.find(n => n.toLowerCase() === lowerSearch) || null;
  }, []);

  // Draw custom wheel with names
  const drawWheel = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 10;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (availableNames.length === 0) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.fillStyle = '#e0e0e0';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      ctx.stroke();
      
      // Center text
      ctx.fillStyle = '#999';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Add names to start', centerX, centerY);
      return;
    }

    const sliceAngle = (2 * Math.PI) / availableNames.length;
    const rotationRad = (rotation * Math.PI) / 180;

    availableNames.forEach((name, index) => {
      const startAngle = rotationRad + index * sliceAngle - Math.PI / 2;
      const endAngle = startAngle + sliceAngle;

      // Draw slice
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = nameColorMap[name] || WHEEL_COLORS[index % WHEEL_COLORS.length];
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw name
      const textAngle = startAngle + sliceAngle / 2;
      const textRadius = radius * 0.65;
      const textX = centerX + Math.cos(textAngle) * textRadius;
      const textY = centerY + Math.sin(textAngle) * textRadius;

      ctx.save();
      ctx.translate(textX, textY);
      ctx.rotate(textAngle + Math.PI / 2);
      ctx.fillStyle = '#333';
      ctx.font = 'bold 13px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      const words = name.split(' ');
      const lineHeight = 16;
      
      if (words.length > 1) {
        words.forEach((word, i) => {
          const y = (i - (words.length - 1) / 2) * lineHeight;
          const displayWord = word.length > 15 ? word.substring(0, 13) + '...' : word;
          ctx.fillText(displayWord, 0, y);
        });
      } else {
        const displayName = name.length > 15 ? name.substring(0, 13) + '...' : name;
        ctx.fillText(displayName, 0, 0);
      }
      ctx.restore();
    });

    // Center circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, 40, 0, 2 * Math.PI);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Center emoji
    ctx.font = '28px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(isSpinning ? '🎲' : '🎲', centerX, centerY);
  }, [availableNames, rotation, nameColorMap, isSpinning]);

  // Redraw wheel on every rotation change
  useEffect(() => {
    drawWheel();
  }, [drawWheel]);

  const easeOut = (t: number) => 1 - Math.pow(1 - t, 5);

  const spin = useCallback(() => {
    if (isSpinning || currentMonthIndex >= MONTHS.length || availableNames.length === 0) return;
    
    setIsSpinning(true);
    const currentMonth = MONTHS[currentMonthIndex];
    
    let assigned: string;
    
    // Check if this month has a switch assignment (case-insensitive)
    const switchEntry = isSwitchEnabled ? RIGGED_ASSIGNMENTS.find(r => r.month === currentMonth) : null;
    if (switchEntry) {
      const foundName = findNameCaseInsensitive(switchEntry.name, availableNames);
      if (foundName) {
        assigned = foundName;
      } else {
        // Switch name not available, pick randomly
        assigned = availableNames[Math.floor(Math.random() * availableNames.length)];
      }
    } else {
      // Random selection for other months
      assigned = availableNames[Math.floor(Math.random() * availableNames.length)];
    }

    const assignedIndex = availableNames.indexOf(assigned);
    const segmentAngle = 360 / availableNames.length;
    
    // Calculate target: arrow is at top (270 degrees or -90 degrees)
    // We need the middle of the assigned segment to be at the top
    // Segment i starts at (i * segmentAngle) from initial position
    // We want to rotate so that segment's middle aligns with top (270 deg)
    const segmentMiddle = assignedIndex * segmentAngle + segmentAngle / 2;
    const targetAngle = (360 - segmentMiddle) % 360;

    const totalDuration = 5000;
    const fullSpins = 360 * 5; // 5 full rotations
    const totalRotationNeeded = fullSpins + ((targetAngle - (rotation % 360) + 360) % 360);
    const startRotation = rotation;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / totalDuration, 1);
      const easedProgress = easeOut(progress);
      const newRotation = startRotation + easedProgress * totalRotationNeeded;

      setRotation(newRotation);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setAssignments(prev => [...prev, { month: currentMonth, person: assigned }]);
        setCurrentMonthIndex(prev => prev + 1);
        setIsSpinning(false);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  }, [isSpinning, currentMonthIndex, availableNames, rotation, findNameCaseInsensitive]);

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const handleAddName = () => {
    const trimmed = newName.trim();
    if (trimmed && !names.some(n => n.toLowerCase() === trimmed.toLowerCase())) {
      setNames(prev => [...prev, trimmed]);
      setNewName('');
    } else if (names.some(n => n.toLowerCase() === trimmed.toLowerCase())) {
      alert('This name already exists!');
    }
  };

  const handleRemoveName = (nameToRemove: string) => {
    setNames(prev => prev.filter(n => n !== nameToRemove));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split(/[\r\n]+/).map(line => line.trim()).filter(line => line);
      
      // Add only unique names (case-insensitive check)
      const existingLower = names.map(n => n.toLowerCase());
      const newNames = lines.filter(line => !existingLower.includes(line.toLowerCase()));
      setNames(prev => [...prev, ...newNames]);
    };
    reader.readAsText(file);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleStart = () => {
    if (names.length < 2) {
      alert('Please add at least 2 names before starting!');
      return;
    }
    setStarted(true);
  };

  const handleReset = () => {
    setStarted(false);
    setCurrentMonthIndex(0);
    setAssignments([]);
    setRotation(0);
    setIsSpinning(false);
  };

  const handleClearNames = () => {
    setNames([]);
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (started) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Check distance from center (radius 40)
    const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));

    if (distance <= 40) {
      setClickCount(prev => {
        const newCount = prev + 1;
        if (!isSwitchEnabled) {
          // Need 3 clicks to enable
          if (newCount >= 3) {
            setIsSwitchEnabled(true);
            return 0;
          }
          return newCount;
        } else {
          // Need 2 clicks to disable
          if (newCount >= 2) {
            setIsSwitchEnabled(false);
            return 0;
          }
          return newCount;
        }
      });
    } else {
      setClickCount(0);
    }
  };

  const isComplete = currentMonthIndex >= MONTHS.length || availableNames.length === 0;

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl mb-2">
            Roster Picker
          </h1>
          <p className="text-lg text-slate-600">Monthly Assignments: Jan 2026 - Nov 2026</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Panel - Names Management */}
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <span className="bg-blue-100 text-blue-600 p-1.5 rounded-lg">👥</span>
                  Participants
                </h2>
                <span className="bg-slate-100 text-slate-600 text-xs font-medium px-2.5 py-0.5 rounded-full">
                  {names.length}
                </span>
              </div>

              {/* Add Name Input */}
              {!started && (
                <div className="space-y-3 mb-6">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddName()}
                      placeholder="Type a name..."
                      className="flex-1 px-1 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                    />
                    <button
                      onClick={handleAddName}
                      className="px-3 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors"
                    >
                      Add
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-2 bg-white border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                    >
                      <span>📁</span> Upload
                    </button>
                    {names.length > 0 && (
                      <button
                        onClick={handleClearNames}
                        className="px-3 py-2 bg-white border border-red-200 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 transition-colors"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".txt,.csv"
                    className="hidden"
                  />
                </div>
              )}

              {/* Names List */}
              <div className="max-h-[500px] overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                {names.map((name, index) => (
                  <div
                    key={index}
                    className={`group flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all ${
                      assignedNames.includes(name)
                        ? 'bg-slate-50 text-slate-400'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border border-transparent hover:border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div 
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${assignedNames.includes(name) ? 'bg-slate-300' : ''}`}
                        style={{ backgroundColor: !assignedNames.includes(name) ? (nameColorMap[name] || WHEEL_COLORS[index % WHEEL_COLORS.length]) : undefined }}
                      />
                      <span className={`truncate ${assignedNames.includes(name) ? 'line-through' : 'font-medium'}`}>
                        {name}
                      </span>
                    </div>
                    {!started && (
                      <button
                        onClick={() => handleRemoveName(name)}
                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 p-1 rounded transition-all"
                        aria-label="Remove"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                {names.length === 0 && (
                  <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl">
                    <p className="text-slate-400 text-sm">No participants yet</p>
                    <p className="text-slate-400 text-xs mt-1">Add names to begin</p>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Center Panel - Wheel */}
          <div className="lg:col-span-6 flex flex-col items-center">
            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8 w-full max-w-2xl">
              {/* Current Month Badge */}
              <div className="text-center mb-8">
                <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-sm font-semibold tracking-wide uppercase ${
                  isComplete 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-blue-50 text-blue-700'
                }`}>
                  {isComplete ? 'Assignment Complete' : MONTHS[currentMonthIndex]}
                </span>
              </div>

              {/* Wheel Container */}
              <div className="relative mx-auto mb-10" style={{ width: '500px', height: '500px' }}>
                {/* Arrow */}
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-20 filter drop-shadow-md">
                  <div className="w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-t-[40px] border-t-slate-800"></div>
                </div>
                
                {/* Canvas Wheel */}
                <canvas
                  ref={canvasRef}
                  width={500}
                  height={500}
                  className="relative z-10 cursor-pointer"
                  onClick={handleCanvasClick}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-4 max-w-xs mx-auto">
                {!started ? (
                  <button
                    onClick={handleStart}
                    disabled={names.length < 2}
                    className={`w-full py-4 px-6 text-lg font-bold rounded-xl shadow-lg transform transition-all active:scale-95 ${
                      names.length < 2
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                        : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-blue-200'
                    }`}
                  >
                    Start Assignment
                  </button>
                ) : (
                  <>
                    {!isComplete && (
                      <button
                        onClick={spin}
                        disabled={isSpinning}
                        className={`w-full py-4 px-6 text-lg font-bold rounded-xl shadow-lg transform transition-all active:scale-95 ${
                          isSpinning
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                            : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-indigo-200'
                        }`}
                      >
                        {isSpinning ? 'Spinning...' : 'Spin Wheel'}
                      </button>
                    )}
                    <button
                      onClick={handleReset}
                      className="w-full py-3 px-6 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:text-slate-900 transition-colors"
                    >
                      Reset All
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel - Results */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 h-full min-h-[600px] flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <span className="bg-green-100 text-green-600 p-1.5 rounded-lg">📊</span>
                  Results
                </h2>
                {started && (
                  <span className="text-xs font-medium text-slate-500">
                    {Math.round((assignments.length / MONTHS.length) * 100)}% Done
                  </span>
                )}
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar -mx-2 px-2">
                {assignments.length > 0 ? (
                  <div className="space-y-3">
                    {assignments.map((assignment, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 border border-slate-100 animate-in fade-in slide-in-from-bottom-2 duration-300"
                      >
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 shadow-sm">
                          {index + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-0.5">
                            {assignment.month.split(' ')[0]}
                          </p>
                          <p className="text-sm font-bold text-slate-900 truncate">
                            {assignment.person}
                          </p>
                        </div>
                        <div className="text-green-500">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                      <span className="text-2xl opacity-50">🎲</span>
                    </div>
                    <p className="text-slate-900 font-medium mb-1">
                      No results yet
                    </p>
                    <p className="text-slate-500 text-sm">
                      {isSwitchEnabled ? 'Start the assignment to see who gets picked!' : 'Start the assignment to see who gets picked.'}
                    </p>
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              {started && (
                <div className="mt-6 pt-6 border-t border-slate-100">
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 transition-all duration-500 ease-out"
                      style={{ width: `${(assignments.length / MONTHS.length) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
}
