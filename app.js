(() => {
  const monthLabel = document.getElementById('monthLabel')
  const calendar = document.getElementById('calendar')
  const prev = document.getElementById('prev')
  const next = document.getElementById('next')
  const modal = document.getElementById('modal')
  const modalDate = document.getElementById('modalDate')
  const profitInput = document.getElementById('profit')
  const notesInput = document.getElementById('notes')
  const saveBtn = document.getElementById('save')
  const closeBtn = document.getElementById('close')
  const sumEl = document.getElementById('sum')
  const photoInput = document.getElementById('photo')
  const photoPreview = document.getElementById('photoPreview')
  const removePhotoBtn = document.getElementById('removePhoto')

  let view = new Date()
  let selectedDate = null

  const STORAGE_KEY = 'trading.calendar.entries.v1'

  function loadData(){
    try{const raw = localStorage.getItem(STORAGE_KEY); return raw?JSON.parse(raw):{}}
    catch(e){console.error(e);return{}}
  }

  function saveData(data){ localStorage.setItem(STORAGE_KEY, JSON.stringify(data)) }

  function getKey(d){
    // Use local date components to avoid UTC shifting (fixes first-of-month issue)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  function formatCurrency(n){ return new Intl.NumberFormat(undefined,{style:'currency',currency:'USD',maximumFractionDigits:2}).format(n||0) }

  function render(){
    calendar.innerHTML = ''
    const year = view.getFullYear(), month = view.getMonth()
    const start = new Date(year, month, 1)
    const startDay = start.getDay() // 0-6 (Sun-Sat)
    const daysInMonth = new Date(year, month+1, 0).getDate()

    // show Monday as first day of week
    const weekdays = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
    weekdays.forEach((w, idx) => {
      const el = document.createElement('div')
      el.className = 'weekday' + (idx >= 5 ? ' weekend' : '')
      el.textContent = w
      calendar.appendChild(el)
    })

    // shift start day so Monday=0, ... Sunday=6
    const prevDays = (start.getDay() + 6) % 7
    const prevMonthLast = new Date(year, month, 0).getDate()
    for(let i=prevDays-1;i>=0;i--){
      const d = new Date(year, month-1, prevMonthLast - i)
      calendar.appendChild(makeDayCell(d,true))
    }

    for(let d=1; d<=daysInMonth; d++){
      const date = new Date(year, month, d)
      calendar.appendChild(makeDayCell(date,false))
    }

    // fill to complete grid (optional)
    const totalCells = calendar.childElementCount
    const remainder = (7 - (totalCells % 7)) % 7
    for(let i=1;i<=remainder;i++){
      const d = new Date(year, month+1, i)
      calendar.appendChild(makeDayCell(d,true))
    }

    monthLabel.textContent = view.toLocaleString(undefined,{month:'long', year:'numeric'})
    computeSum()
  }

  function makeDayCell(date, outside){
    const el = document.createElement('div')
    el.className = 'day' + (outside? ' outside':'')
    // mark weekend date cells (Sunday=0, Saturday=6)
    if(date.getDay() === 0 || date.getDay() === 6) el.classList.add('weekend')
    const data = loadData()
    const key = getKey(date)
    const entry = data[key]
    if(entry && Number(entry.profit)) el.classList.add('has-profit')

    const top = document.createElement('div'); top.className='date'; top.textContent = date.getDate()
    const bottom = document.createElement('div'); bottom.className='profit'
    bottom.textContent = entry && entry.profit? formatCurrency(Number(entry.profit)) : ''
    // show small note indicator when notes exist
    if(entry && entry.notes && String(entry.notes).trim() !== ''){
      const note = document.createElement('div')
      note.className = 'note-indicator'
      note.title = 'Has note'
      note.textContent = '✎'
      el.appendChild(note)
    }
    // show thumbnail when a photo is attached
    if(entry && entry.photo){
      const thumb = document.createElement('img')
      thumb.className = 'day-thumb'
      thumb.src = entry.photo
      thumb.alt = 'photo'
      el.appendChild(thumb)
    }
    // mark negative values
    if(entry && entry.profit !== '' && Number(entry.profit) < 0){
      bottom.classList.add('negative')
    } else {
      bottom.classList.remove('negative')
    }
    el.appendChild(top); el.appendChild(bottom)

    el.addEventListener('click', ()=>{ selectedDate = date; openModal(date) })
    return el
  }

  function openModal(date){
    const key = getKey(date)
    const data = loadData()
    const entry = data[key] || {profit:'',notes:''}
    modalDate.textContent = date.toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric',year:'numeric'})
    profitInput.value = entry.profit
    // color input red when negative
    if(entry.profit !== '' && !Number.isNaN(Number(entry.profit)) && Number(entry.profit) < 0){
      profitInput.classList.add('negative')
    } else {
      profitInput.classList.remove('negative')
    }
    notesInput.value = entry.notes
    // photo handling
    if(entry.photo){
      photoPreview.src = entry.photo
      photoPreview.classList.remove('hidden')
      removePhotoBtn.classList.remove('hidden')
    } else {
      photoPreview.src = ''
      photoPreview.classList.add('hidden')
      removePhotoBtn.classList.add('hidden')
    }
    photoInput.value = ''
    modal.classList.remove('hidden')
    profitInput.focus()
  }

  // live input styling for negative numbers
  profitInput.addEventListener('input', ()=>{
    const v = profitInput.value
    const n = v === '' ? NaN : Number(v)
    if(!Number.isNaN(n) && n < 0) profitInput.classList.add('negative')
    else profitInput.classList.remove('negative')
  })

  // photo input -> preview as data URL
  photoInput.addEventListener('change', (ev)=>{
    const f = ev.target.files && ev.target.files[0]
    if(!f) return
    const reader = new FileReader()
    reader.onload = () => {
      photoPreview.src = reader.result
      photoPreview.classList.remove('hidden')
      removePhotoBtn.classList.remove('hidden')
    }
    reader.readAsDataURL(f)
  })

  removePhotoBtn.addEventListener('click', ()=>{
    // clear preview visually
    photoPreview.src = ''
    photoPreview.removeAttribute('src')
    photoPreview.classList.add('hidden')
    photoPreview.style.display = 'none'
    removePhotoBtn.classList.add('hidden')
    photoInput.value = ''

    // persist removal immediately for the open date (so thumbnail disappears)
    if(selectedDate){
      const key = getKey(selectedDate)
      const data = loadData()
      const entry = data[key]
      if(entry){
        delete entry.photo
        // if entry now empty, remove it
        const noProfit = entry.profit === '' || Number.isNaN(Number(entry.profit))
        const noNotes = !entry.notes || String(entry.notes).trim() === ''
        const noPhoto = !entry.photo
        if(noProfit && noNotes && noPhoto){
          delete data[key]
        } else {
          data[key] = entry
        }
        saveData(data)
        render()
      }
    }
  })

  function closeModal(){ modal.classList.add('hidden'); selectedDate = null }

  saveBtn.addEventListener('click', ()=>{
    if(!selectedDate) return closeModal()
    const key = getKey(selectedDate)
    const data = loadData()
    const p = profitInput.value === '' ? '' : Number(profitInput.value)
    const hasPhoto = photoPreview && photoPreview.src && String(photoPreview.src).length > 0
    // build entry object; only include `photo` when there is one
    const entry = {profit: p, notes: notesInput.value}
    if(hasPhoto) entry.photo = photoPreview.src

    // if entry has no meaningful data, remove it entirely
    const noProfit = entry.profit === '' || Number.isNaN(Number(entry.profit))
    const noNotes = !entry.notes || String(entry.notes).trim() === ''
    const noPhoto = !entry.photo
    if(noProfit && noNotes && noPhoto){
      delete data[key]
    } else {
      data[key] = entry
    }
    saveData(data)
    render()
    closeModal()
  })

  closeBtn.addEventListener('click', ()=> closeModal())
  modal.addEventListener('click', (e)=>{ if(e.target === modal) closeModal() })

  prev.addEventListener('click', ()=>{ view = new Date(view.getFullYear(), view.getMonth()-1, 1); render() })
  next.addEventListener('click', ()=>{ view = new Date(view.getFullYear(), view.getMonth()+1, 1); render() })

  function computeSum(){
    const data = loadData()
    const year = view.getFullYear(), month = view.getMonth()
    let sum = 0
    Object.keys(data).forEach(k=>{
      if(k.startsWith(year+'-')){
        const m = Number(k.slice(5,7)) - 1
        if(m === month){ const p = Number(data[k].profit) || 0; sum += p }
      }
    })
    sumEl.textContent = 'Monthly: ' + formatCurrency(sum)
    // color the monthly sum red when negative
    if(sum < 0) sumEl.classList.add('negative')
    else sumEl.classList.remove('negative')
  }

  // initial render
  render()

  // expose a window helper for debugging
  window.Trading = {loadData, saveData}
})();

