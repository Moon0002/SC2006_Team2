'use client'

// HourlyRateSlider - Range slider component for adjusting user's hourly rate for opportunity cost calculation
import { useState, useEffect } from 'react'
import { DollarSign } from 'lucide-react'

export default function HourlyRateSlider({
  value = 10,
  onChange,
  min = 0,
  max = 200,
  step = 1,
}) {
  const [sliderValue, setSliderValue] = useState(value)

  useEffect(() => {
    setSliderValue(value)
  }, [value])

  const handleChange = (e) => {
    const newValue = parseFloat(e.target.value)
    setSliderValue(newValue)
    if (onChange) {
      onChange(newValue)
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-gray-600" />
          <label className="text-sm font-semibold text-gray-900">
            Your Hourly Rate
          </label>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-blue-600">
            ${sliderValue.toFixed(2)}
          </div>
          <div className="text-xs text-gray-500">per hour</div>
          </div>
        </div>

      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={sliderValue}
          onChange={handleChange}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
          style={{
            background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${
              ((sliderValue - min) / (max - min)) * 100
            }%, #e5e7eb ${((sliderValue - min) / (max - min)) * 100}%, #e5e7eb 100%)`,
          }}
        />
        
        <style jsx>{`
          .slider::-webkit-slider-thumb {
            appearance: none;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: #3b82f6;
            cursor: pointer;
            border: 2px solid white;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          }
          .slider::-moz-range-thumb {
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: #3b82f6;
            cursor: pointer;
            border: 2px solid white;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          }
        `}</style>
      </div>

      <div className="flex justify-between mt-2 text-xs text-gray-500">
        <span>${min}/hr</span>
        <span>${max}/hr</span>
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded-md">
        <p className="text-xs text-blue-800">
          💡 <strong>Tip:</strong> Adjust this to reflect your personal time value. 
          Higher rates mean your time is worth more, making longer trips less worthwhile.
        </p>
      </div>
    </div>
  )
}
