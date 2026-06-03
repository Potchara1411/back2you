import { useMemo } from 'react';
import {
  buildingsByArea,
  composeLocation,
  getLocationDetails,
  parseLocationParts,
} from '../data/postOptions';

const areaOptions = Object.keys(buildingsByArea);

export default function LocationPicker({ location, onChange, framed = true }) {
  const parsedLocation = useMemo(() => parseLocationParts(location), [location]);
  const { area, building, detail } = parsedLocation;
  const detailOptions = useMemo(() => getLocationDetails(building), [building]);
  const visibleBuildingGroups = area
    ? [[area, buildingsByArea[area]]]
    : Object.entries(buildingsByArea);

  function updateLocation(nextArea, nextBuilding, nextDetail) {
    onChange(composeLocation(nextArea, nextBuilding, nextDetail));
  }

  return (
    <div
      className={`space-y-3 ${
        framed ? 'rounded-2xl border border-slate-200 bg-white p-3' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Selected location</p>
          <p className="mt-1 break-words text-sm font-semibold text-slate-950">
            {location || 'No location selected'}
          </p>
        </div>
        {location && (
          <button
            className="shrink-0 px-1 py-1 text-xs font-semibold text-blue-600"
            type="button"
            onClick={() => updateLocation('', '', '')}
          >
            Clear
          </button>
        )}
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold text-slate-500">Area</p>
        <div className="grid grid-cols-4 gap-2">
          {['', ...areaOptions].map((areaOption) => {
            const isSelected = area === areaOption;
            return (
              <button
                key={areaOption || 'all'}
                aria-pressed={isSelected}
                className={`h-10 rounded-xl border px-2 text-xs font-semibold ${
                  isSelected
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-slate-200 bg-slate-50 text-slate-600'
                }`}
                type="button"
                onClick={() => updateLocation(areaOption, '', '')}
              >
                {areaOption || 'All'}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold text-slate-500">Campus buildings</p>
        <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-2">
          {visibleBuildingGroups.map(([areaName, buildingNames]) => (
            <div key={areaName} className="mb-3 last:mb-0">
              <p className="px-2 pb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                {areaName}
              </p>
              <div className="space-y-1">
                {buildingNames.map((buildingName) => {
                  const isSelected = building === buildingName;
                  return (
                    <button
                      key={buildingName}
                      aria-pressed={isSelected}
                      className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium ${
                        isSelected
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-slate-700 hover:bg-blue-50 hover:text-blue-700'
                      }`}
                      type="button"
                      onClick={() => updateLocation(areaName, buildingName, '')}
                    >
                      {buildingName}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {building && (
        <div>
          <p className="mb-2 text-xs font-semibold text-slate-500">Floor / entrance</p>
          <div className="flex flex-wrap gap-2">
            {['', ...detailOptions].map((detailOption) => {
              const isSelected = detail === detailOption;
              return (
                <button
                  key={detailOption || 'any'}
                  aria-pressed={isSelected}
                  className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
                    isSelected
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-slate-200 bg-slate-50 text-slate-600'
                  }`}
                  type="button"
                  onClick={() => updateLocation(area, building, detailOption)}
                >
                  {detailOption || 'Any floor / entrance'}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
