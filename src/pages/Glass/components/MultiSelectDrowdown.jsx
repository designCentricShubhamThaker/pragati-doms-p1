// src/components/MultiSelectDropdown.jsx
import React from "react";
import { ChevronDown, Check } from "lucide-react";

const MultiSelectDropdown = ({
  label,
  options,
  selectedValues,
  onChange,
  placeholder,
  isOpen,
  onToggle
}) => {
  const toggleValue = (value) => {
    onChange(
      selectedValues.includes(value)
        ? selectedValues.filter((v) => v !== value)
        : [...selectedValues, value]
    );
  };

  const handleSelectAll = () => {
    onChange(
      selectedValues.length === options.length
        ? []
        : options.map((opt) => opt.value)
    );
  };

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-orange-800 mb-2">
        {label}
      </label>

      <button
        type="button"
        onClick={onToggle}
        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm flex items-center justify-between"
      >
        <span
          className={`truncate ${
            selectedValues.length === 0
              ? "text-slate-500"
              : "text-orange-800"
          }`}
        >
          {selectedValues.length === 0
            ? placeholder
            : selectedValues.length === 1
            ? options.find((opt) => opt.value === selectedValues[0])?.label
            : `${selectedValues.length} selected`}
        </span>
        <ChevronDown
          size={16}
          className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          <div className="p-2 border-b border-slate-100">
            <button
              type="button"
              onClick={handleSelectAll}
              className="w-full text-left px-2 py-1 text-sm text-orange-600 hover:bg-orange-50 rounded"
            >
              {selectedValues.length === options.length
                ? "Deselect All"
                : "Select All"}
            </button>
          </div>

          {options.map((option) => (
            <div
              key={option.value}
              className="flex items-center px-3 py-2 hover:bg-slate-50 cursor-pointer"
              onClick={() => toggleValue(option.value)}
            >
              <div
                className={`w-4 h-4 border border-slate-300 rounded flex items-center justify-center mr-3 ${
                  selectedValues.includes(option.value)
                    ? "bg-orange-600 border-orange-600"
                    : ""
                }`}
              >
                {selectedValues.includes(option.value) && (
                  <Check size={12} className="text-white" />
                )}
              </div>
              <span className="text-sm text-orange-800 font-mono">
                {option.label}
              </span>
              <span className="ml-auto text-xs text-slate-400">
                ({option.count})
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MultiSelectDropdown;
