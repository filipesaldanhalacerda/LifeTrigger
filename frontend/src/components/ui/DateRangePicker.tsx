import { useState, useRef, useEffect, useCallback } from 'react'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'

// ── Portuguese locale ────────────────────────────────────────────
const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]
const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

// ── Date helpers (all local, no timezone) ────────────────────────
function toKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function parseKey(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}
function formatBR(s: string) {
  const [y, m, d] = s.split('-')
  return `${d}/${m}/${y}`
}
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}
function inRange(day: Date, start: Date, end: Date) {
  return day >= start && day <= end
}

// ── Preset ranges ────────────────────────────────────────────────
interface Preset { label: string; start: string; end: string }

function getPresets(): Preset[] {
  const now = new Date()
  const today = toKey(now)

  const d7 = new Date(now); d7.setDate(d7.getDate() - 6)
  const d30 = new Date(now); d30.setDate(d30.getDate() - 29)
  const d90 = new Date(now); d90.setDate(d90.getDate() - 89)

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
  const lastMonthStart = new Date(lastMonthEnd.getFullYear(), lastMonthEnd.getMonth(), 1)

  return [
    { label: 'Hoje', start: today, end: today },
    { label: 'Últimos 7 dias', start: toKey(d7), end: today },
    { label: 'Últimos 30 dias', start: toKey(d30), end: today },
    { label: 'Últimos 90 dias', start: toKey(d90), end: today },
    { label: 'Este mês', start: toKey(monthStart), end: today },
    { label: 'Mês anterior', start: toKey(lastMonthStart), end: toKey(lastMonthEnd) },
  ]
}

// ── Calendar grid ────────────────────────────────────────────────
function CalendarMonth({
  year, month, onPrev, onNext,
  rangeStart, rangeEnd, hoverDate,
  onDayClick, onDayHover, maxDate,
}: {
  year: number; month: number
  onPrev?: () => void; onNext?: () => void
  rangeStart: Date | null; rangeEnd: Date | null; hoverDate: Date | null
  onDayClick: (d: Date) => void; onDayHover: (d: Date | null) => void
  maxDate?: Date
}) {
  const firstDay = new Date(year, month, 1)
  const startWeekday = firstDay.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells: (Date | null)[] = []
  for (let i = 0; i < startWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))

  const effectiveEnd = rangeEnd ?? hoverDate

  return (
    <div className="select-none w-[252px]">
      <div className="flex items-center justify-between mb-3 px-1">
        {onPrev
          ? <button type="button" onClick={onPrev} aria-label="Mês anterior" className="p-1 rounded-md hover:bg-slate-100 text-slate-500 transition-colors"><ChevronLeft className="h-4 w-4" /></button>
          : <div className="w-6" />
        }
        <span className="text-sm font-semibold text-slate-800">{MONTHS[month]} {year}</span>
        {onNext
          ? <button type="button" onClick={onNext} aria-label="Próximo mês" className="p-1 rounded-md hover:bg-slate-100 text-slate-500 transition-colors"><ChevronRight className="h-4 w-4" /></button>
          : <div className="w-6" />
        }
      </div>

      <div className="grid grid-cols-7">
        {WEEKDAYS.map((w, i) => (
          <div key={i} className="py-1.5 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-400">{w}</div>
        ))}
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />

          const isDisabled = maxDate ? day > maxDate : false
          const isStart = rangeStart && sameDay(day, rangeStart)
          const isEnd = effectiveEnd && rangeStart && sameDay(day, effectiveEnd)
          const isMid = rangeStart && effectiveEnd && !isStart && !isEnd && inRange(day, rangeStart, effectiveEnd)
          const isToday = sameDay(day, new Date())

          let cls = 'relative h-8 w-8 flex items-center justify-center text-xs rounded-full transition-all duration-100 '
          if (isDisabled) {
            cls += 'text-slate-300 cursor-not-allowed'
          } else if (isStart || isEnd) {
            cls += 'bg-brand-600 text-white font-bold shadow-sm'
          } else if (isMid) {
            cls += 'bg-brand-50 text-brand-700 font-medium'
          } else if (isToday) {
            cls += 'font-bold text-brand-600 ring-1 ring-brand-300 hover:bg-brand-50 cursor-pointer'
          } else {
            cls += 'text-slate-700 hover:bg-slate-100 cursor-pointer'
          }

          // Range background band
          let bandCls = ''
          if (isMid) bandCls = 'bg-brand-50'
          else if (isStart && effectiveEnd && rangeStart && !sameDay(rangeStart, effectiveEnd)) bandCls = 'bg-brand-50 rounded-l-full'
          else if (isEnd && rangeStart && effectiveEnd && !sameDay(rangeStart, effectiveEnd)) bandCls = 'bg-brand-50 rounded-r-full'

          return (
            <div key={toKey(day)} className={`flex items-center justify-center ${bandCls}`}>
              <button
                type="button"
                disabled={isDisabled}
                onClick={() => !isDisabled && onDayClick(day)}
                onMouseEnter={() => !isDisabled && onDayHover(day)}
                className={cls}
              >
                {day.getDate()}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Main DateRangePicker ─────────────────────────────────────────
interface DateRangePickerProps {
  startDate: string   // 'YYYY-MM-DD'
  endDate: string     // 'YYYY-MM-DD'
  onChange: (start: string, end: string) => void
  maxDate?: string
}

export function DateRangePicker({ startDate, endDate, onChange, maxDate }: DateRangePickerProps) {
  const [open, setOpen] = useState(false)
  const [selecting, setSelecting] = useState<'start' | 'end' | null>(null)
  const [tempStart, setTempStart] = useState<Date | null>(null)
  const [tempEnd, setTempEnd] = useState<Date | null>(null)
  const [hover, setHover] = useState<Date | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  // Two calendar months: left = current - 1, right = current
  const now = new Date()
  const [rightYear, setRightYear] = useState(now.getFullYear())
  const [rightMonth, setRightMonth] = useState(now.getMonth())

  const leftMonth = rightMonth === 0 ? 11 : rightMonth - 1
  const leftYear = rightMonth === 0 ? rightYear - 1 : rightYear

  const maxD = maxDate ? parseKey(maxDate) : new Date()

  // Sync from props when opening
  const openPicker = useCallback(() => {
    setTempStart(parseKey(startDate))
    setTempEnd(parseKey(endDate))
    setSelecting(null)
    setHover(null)
    // Set right month to endDate month
    const ed = parseKey(endDate)
    setRightYear(ed.getMonth() === 0 ? ed.getFullYear() : ed.getFullYear())
    const rm = ed.getMonth()
    // Make sure left month is different
    if (rm === parseKey(startDate).getMonth() && rm === 0) {
      setRightMonth(1)
    } else {
      setRightMonth(rm === 0 ? 1 : rm)
    }
    setOpen(true)
  }, [startDate, endDate])

  // Click outside to close
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  function handleDayClick(day: Date) {
    if (!selecting || selecting === 'start') {
      setTempStart(day)
      setTempEnd(null)
      setSelecting('end')
      setHover(null)
    } else {
      if (tempStart && day < tempStart) {
        // Clicked before start — swap
        setTempEnd(tempStart)
        setTempStart(day)
      } else {
        setTempEnd(day)
      }
      setSelecting(null)
    }
  }

  function handleApply() {
    if (tempStart && tempEnd) {
      onChange(toKey(tempStart), toKey(tempEnd))
      setOpen(false)
    }
  }

  function applyPreset(p: Preset) {
    setTempStart(parseKey(p.start))
    setTempEnd(parseKey(p.end))
    setSelecting(null)
    onChange(p.start, p.end)
    setOpen(false)
  }

  function prevMonth() {
    if (rightMonth === 0) { setRightMonth(11); setRightYear(rightYear - 1) }
    else if (rightMonth === 1) { setRightMonth(0); setRightYear(rightYear) }
    else setRightMonth(rightMonth - 1)
  }

  function nextMonth() {
    if (rightMonth === 11) { setRightMonth(0); setRightYear(rightYear + 1) }
    else setRightMonth(rightMonth + 1)
  }

  const presets = getPresets()
  const effectiveEnd = tempEnd ?? hover

  return (
    <div ref={ref} className="relative">
      {/* Trigger button */}
      <button
        type="button"
        onClick={openPicker}
        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-card hover:border-brand-300 hover:shadow-md transition-all"
      >
        <Calendar className="h-4 w-4 text-brand-500" />
        <span className="text-sm font-medium text-slate-700">
          {formatBR(startDate)}
        </span>
        <span className="text-slate-400 text-xs">→</span>
        <span className="text-sm font-medium text-slate-700">
          {formatBR(endDate)}
        </span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 flex flex-col sm:flex-row rounded-2xl border border-slate-200 bg-white shadow-elevated animate-scaleIn origin-top-left max-w-[calc(100vw-2rem)]">
          {/* Presets — horizontal on mobile, sidebar on desktop */}
          <div className="border-b sm:border-b-0 sm:border-r border-slate-100 py-2 sm:py-3 px-2 sm:min-w-[140px]">
            <p className="px-2 pb-1.5 sm:pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Período</p>
            <div className="flex flex-wrap gap-1 sm:flex-col sm:gap-0">
              {presets.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => applyPreset(p)}
                  className="rounded-lg px-2.5 py-1.5 text-xs text-slate-600 hover:bg-brand-50 hover:text-brand-700 transition-colors sm:w-full sm:text-left"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Calendars — single on mobile, dual on desktop */}
          <div className="p-3 sm:p-4">
            <div className="flex gap-6">
              {/* Left calendar hidden on mobile */}
              <div className="hidden sm:block">
                <CalendarMonth
                  year={leftYear}
                  month={leftMonth}
                  onPrev={prevMonth}
                  rangeStart={tempStart}
                  rangeEnd={selecting === 'end' ? null : tempEnd}
                  hoverDate={selecting === 'end' ? (effectiveEnd ?? null) : null}
                  onDayClick={handleDayClick}
                  onDayHover={(d) => selecting === 'end' && setHover(d)}
                  maxDate={maxD}
                />
              </div>
              <CalendarMonth
                year={rightYear}
                month={rightMonth}
                onPrev={prevMonth}
                onNext={nextMonth}
                rangeStart={tempStart}
                rangeEnd={selecting === 'end' ? null : tempEnd}
                hoverDate={selecting === 'end' ? (effectiveEnd ?? null) : null}
                onDayClick={handleDayClick}
                onDayHover={(d) => selecting === 'end' && setHover(d)}
                maxDate={maxD}
              />
            </div>

            {/* Footer */}
            <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between border-t border-slate-100 pt-3 gap-2">
              <div className="text-xs text-slate-500">
                {tempStart && (
                  <span>
                    <span className="font-semibold text-slate-700">{formatBR(toKey(tempStart))}</span>
                    {tempEnd && (
                      <>
                        <span className="mx-1.5 text-slate-400">→</span>
                        <span className="font-semibold text-slate-700">{formatBR(toKey(tempEnd))}</span>
                      </>
                    )}
                    {!tempEnd && selecting === 'end' && (
                      <span className="ml-2 text-brand-500">Selecione a data final</span>
                    )}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleApply}
                  disabled={!tempStart || !tempEnd}
                  className="rounded-lg bg-brand-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-brand-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Aplicar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Single DatePicker ────────────────────────────────────────────
interface DatePickerProps {
  value: string         // 'YYYY-MM-DD'
  onChange: (date: string) => void
  maxDate?: string
  placeholder?: string
  className?: string
  error?: boolean
}

export function DatePicker({ value, onChange, maxDate, placeholder, className, error }: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const d = value ? parseKey(value) : new Date()
  const [viewYear, setViewYear] = useState(d.getFullYear())
  const [viewMonth, setViewMonth] = useState(d.getMonth())

  const maxD = maxDate ? parseKey(maxDate) : undefined

  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  function handleOpen() {
    if (value) {
      const p = parseKey(value)
      setViewYear(p.getFullYear())
      setViewMonth(p.getMonth())
    }
    setOpen(true)
  }

  function handleDayClick(day: Date) {
    onChange(toKey(day))
    setOpen(false)
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1) }
    else setViewMonth(viewMonth - 1)
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1) }
    else setViewMonth(viewMonth + 1)
  }

  const borderCls = error
    ? 'border-red-300 focus-within:border-red-400 focus-within:ring-red-100'
    : 'border-slate-200 focus-within:border-brand-400 focus-within:ring-brand-100'

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={handleOpen}
        className={`flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm shadow-card transition-all w-full text-left ${borderCls} ${className ?? ''}`}
      >
        <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
        {value
          ? <span className="text-slate-700">{formatBR(value)}</span>
          : <span className="text-slate-400">{placeholder ?? 'Selecione a data'}</span>
        }
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-elevated animate-scaleIn origin-top-left w-[calc(100vw-2rem)] sm:w-auto max-w-[calc(100vw-2rem)]">
          <CalendarMonth
            year={viewYear}
            month={viewMonth}
            onPrev={prevMonth}
            onNext={nextMonth}
            rangeStart={value ? parseKey(value) : null}
            rangeEnd={null}
            hoverDate={null}
            onDayClick={handleDayClick}
            onDayHover={() => {}}
            maxDate={maxD}
          />
        </div>
      )}
    </div>
  )
}
