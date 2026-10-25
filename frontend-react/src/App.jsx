
import { useEffect, useState } from 'react'

const API = '/api'

function money(value) {
  return Number(value).toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  })
}

async function apiRequest(path, token = '', options = {}) {
  const headers = { ...options.headers }

  if (token) headers.Authorization = `Bearer ${token}`
  if (options.body) headers['Content-Type'] = 'application/json'

  const response = await fetch(`${API}${path}`, {
    ...options,
    headers,
  })

  if (response.status === 204) {
    if (!response.ok) throw new Error('Request failed')
    return null
  }

  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.detail || `Request failed (${response.status})`)

  return data
}

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100'

const primaryButton =
  'rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50'

const outlineButton =
  'rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50'

function App() {
  const [token, setToken] = useState('')
  const [user, setUser] = useState(null)
  const [authMode, setAuthMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [vehicles, setVehicles] = useState([])
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('info')
  const [busy, setBusy] = useState(false)
  const [filters, setFilters] = useState({
    make: '',
    model: '',
    category: '',
    min_price: '',
    max_price: '',
  })
  const [form, setForm] = useState({
    id: '',
    make: '',
    model: '',
    category: '',
    price: '',
    quantity: '',
  })

  const isAdmin = user?.role === 'admin'

  function notify(text, type = 'info') {
    setMessage(text)
    setMessageType(type)
  }

  async function loadVehicles(searchFilters = filters, authToken = token) {
    if (!authToken) return

    setBusy(true)
    try {
      const params = new URLSearchParams()

      Object.entries(searchFilters).forEach(([key, value]) => {
        if (value.trim()) params.set(key, value.trim())
      })

      const query = params.toString()
      const path = query ? `/vehicles/search?${query}` : '/vehicles'
      const data = await apiRequest(path, authToken)
      setVehicles(data)
    } catch (error) {
      notify(error.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  async function handleAuth(event) {
    event.preventDefault()
    setBusy(true)
    notify('')

    try {
      const normalizedEmail = email.trim().toLowerCase()

      if (authMode === 'register') {
        await apiRequest('/auth/register', '', {
          method: 'POST',
          body: JSON.stringify({ email: normalizedEmail, password }),
        })
      }

      const result = await apiRequest('/auth/login', '', {
        method: 'POST',
        body: JSON.stringify({ email: normalizedEmail, password }),
      })

      setToken(result.access_token)
      setUser({ email: result.email, role: result.role })
      setPassword('')
      notify('Welcome to DriveHub.', 'success')
      await loadVehicles(filters, result.access_token)
    } catch (error) {
      notify(error.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  function logout() {
    setToken('')
    setUser(null)
    setVehicles([])
    setPassword('')
    setForm({
      id: '',
      make: '',
      model: '',
      category: '',
      price: '',
      quantity: '',
    })
    notify('You have logged out.')
  }

  function updateFilter(key, value) {
    setFilters((previous) => ({ ...previous, [key]: value }))
  }

  function updateForm(key, value) {
    setForm((previous) => ({ ...previous, [key]: value }))
  }

  function resetForm() {
    setForm({
      id: '',
      make: '',
      model: '',
      category: '',
      price: '',
      quantity: '',
    })
  }

  async function saveVehicle(event) {
    event.preventDefault()

    if (!isAdmin) {
      notify('Admin access required.', 'error')
      return
    }

    const payload = {
      make: form.make.trim(),
      model: form.model.trim(),
      category: form.category.trim(),
      price: Number(form.price),
      quantity: Number(form.quantity),
    }

    if (
      !payload.make ||
      !payload.model ||
      !payload.category ||
      !Number.isFinite(payload.price) ||
      payload.price <= 0 ||
      !Number.isInteger(payload.quantity) ||
      payload.quantity < 0
    ) {
      notify('Enter valid vehicle details, price, and quantity.', 'error')
      return
    }

    setBusy(true)

    try {
      await apiRequest(
        form.id ? `/vehicles/${form.id}` : '/vehicles',
        token,
        {
          method: form.id ? 'PUT' : 'POST',
          body: JSON.stringify(payload),
        },
      )

      resetForm()
      notify(form.id ? 'Vehicle updated successfully.' : 'Vehicle added successfully.', 'success')
      await loadVehicles()
    } catch (error) {
      notify(error.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  async function vehicleAction(action, vehicle) {
    try {
      if (action === 'purchase') {
        if (vehicle.quantity <= 0) return
        if (!window.confirm(`Purchase one ${vehicle.make} ${vehicle.model}?`)) return

        await apiRequest(`/vehicles/${vehicle.id}/purchase`, token, {
          method: 'POST',
        })
        notify('Purchase completed.', 'success')
      }

      if (action === 'edit') {
        if (!isAdmin) return

        setForm({
          id: String(vehicle.id),
          make: vehicle.make,
          model: vehicle.model,
          category: vehicle.category,
          price: String(vehicle.price),
          quantity: String(vehicle.quantity),
        })

        window.scrollTo({ top: 0, behavior: 'smooth' })
        return
      }

      if (action === 'restock') {
        if (!isAdmin) return

        const answer = window.prompt('How many units should be added?', '1')
        if (answer === null) return

        const quantity = Number(answer)
        if (!Number.isInteger(quantity) || quantity <= 0) {
          notify('Enter a positive whole number.', 'error')
          return
        }

        await apiRequest(
          `/vehicles/${vehicle.id}/restock?quantity=${quantity}`,
          token,
          { method: 'POST' },
        )
        notify('Vehicle restocked.', 'success')
      }

      if (action === 'delete') {
        if (!isAdmin) return
        if (!window.confirm(`Delete ${vehicle.make} ${vehicle.model}?`)) return

        await apiRequest(`/vehicles/${vehicle.id}`, token, {
          method: 'DELETE',
        })
        notify('Vehicle deleted.', 'success')
      }

      if (action !== 'edit') await loadVehicles()
    } catch (error) {
      notify(error.message, 'error')
    }
  }

  useEffect(() => {
    if (!token) return
    loadVehicles()
    // Initial inventory load after authentication.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const totalUnits = vehicles.reduce((sum, vehicle) => sum + vehicle.quantity, 0)
  const outOfStock = vehicles.filter((vehicle) => vehicle.quantity === 0).length

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4">
          <a href="#" className="flex items-center gap-3 text-xl font-extrabold tracking-tight text-slate-900">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-lg text-white">
              D
            </span>
            DriveHub
          </a>

          <div className="flex items-center gap-3">
            {user && (
              <>
                <div className="hidden text-right sm:block">
                  <p className="text-sm font-semibold">{user.email}</p>
                  <p className="text-xs capitalize text-slate-500">{user.role}</p>
                </div>
                <button onClick={logout} className={outlineButton}>
                  Log out
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-8 md:py-12">
        {!user ? (
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <section className="py-4 lg:py-12">
              <p className="mb-4 text-xs font-bold tracking-[0.22em] text-blue-600">
                YOUR NEXT JOURNEY STARTS HERE
              </p>
              <h1 className="max-w-xl text-4xl font-black leading-tight tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                Find the car
                <br />
                that moves you.
              </h1>
              <p className="mt-6 max-w-lg text-lg leading-8 text-slate-500">
                Manage dealership inventory, discover vehicles, and keep every detail in one place.
              </p>

              <div className="mt-8 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-700">
                  ✓
                </span>
                <span className="text-sm font-semibold text-slate-700">
                  Simple and secure inventory management
                </span>
              </div>

              <div className="mt-8 grid grid-cols-3 gap-3">
                <div className="rounded-2xl bg-blue-50 p-4">
                  <p className="text-2xl font-black text-blue-700">01</p>
                  <p className="mt-1 text-xs text-slate-500">Sign in</p>
                </div>
                <div className="rounded-2xl bg-slate-100 p-4">
                  <p className="text-2xl font-black text-slate-800">02</p>
                  <p className="mt-1 text-xs text-slate-500">Discover</p>
                </div>
                <div className="rounded-2xl bg-emerald-50 p-4">
                  <p className="text-2xl font-black text-emerald-700">03</p>
                  <p className="mt-1 text-xs text-slate-500">Manage</p>
                </div>
              </div>
            </section>

            <section className="mx-auto w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-8">
              <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login')
                    notify('')
                  }}
                  className={`rounded-lg px-4 py-3 text-sm font-semibold ${authMode === 'login' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'}`}
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('register')
                    notify('')
                  }}
                  className={`rounded-lg px-4 py-3 text-sm font-semibold ${authMode === 'register' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'}`}
                >
                  Create account
                </button>
              </div>

              <h2 className="mt-7 text-2xl font-extrabold text-slate-900">
                {authMode === 'login' ? 'Welcome back' : 'Create your account'}
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                {authMode === 'login' ? 'Log in to access the inventory.' : 'Register to start exploring vehicles.'}
              </p>

              <form onSubmit={handleAuth} className="mt-6 space-y-5">
                <div>
                  <label htmlFor="email" className="mb-2 block text-sm font-semibold">
                    Email address
                  </label>
                  <input
                    id="email"
                    className={inputClass}
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="password" className="mb-2 block text-sm font-semibold">
                    Password
                  </label>
                  <input
                    id="password"
                    className={inputClass}
                    type="password"
                    minLength={authMode === 'register' ? 8 : 1}
                    placeholder={authMode === 'register' ? 'At least 8 characters' : 'Enter your password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
                </div>
                <button type="submit" disabled={busy} className={`${primaryButton} w-full`}>
                  {busy ? 'Please wait...' : authMode === 'login' ? 'Log in' : 'Create account'}
                </button>
              </form>

              {message && (
                <p className={`mt-4 rounded-xl p-3 text-sm ${messageType === 'error' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`} role="status">
                  {message}
                </p>
              )}
            </section>
          </div>
        ) : (
          <div className="space-y-8">
            <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-bold tracking-[0.2em] text-blue-600">DEALERSHIP MANAGEMENT</p>
                <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                  Vehicle inventory
                </h1>
                <p className="mt-2 text-slate-500">Browse, search and manage your dealership vehicles.</p>
              </div>
              <button onClick={() => loadVehicles()} disabled={busy} className={outlineButton}>
                ↻ {busy ? 'Loading...' : 'Refresh inventory'}
              </button>
            </section>

            <section className="grid gap-4 sm:grid-cols-3">
              <StatCard title="Vehicle models" value={vehicles.length} subtitle="Listed in inventory" />
              <StatCard title="Available units" value={totalUnits} subtitle="Total stock quantity" />
              <StatCard title="Out of stock" value={outOfStock} subtitle="Models needing restock" />
            </section>

            {message && (
              <div className={`rounded-xl border p-4 text-sm ${messageType === 'error' ? 'border-red-200 bg-red-50 text-red-700' : messageType === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-600'}`} role="status">
                {message}
              </div>
            )}

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-5">
                <h2 className="text-lg font-bold text-slate-900">Find a vehicle</h2>
                <p className="mt-1 text-sm text-slate-500">Search using any combination of filters.</p>
              </div>
              <form
                onSubmit={(event) => {
                  event.preventDefault()
                  loadVehicles()
                }}
                className="grid gap-3 sm:grid-cols-2 md:grid-cols-3"
              >
                <input className={inputClass} placeholder="Make (e.g. Toyota)" value={filters.make} onChange={(event) => updateFilter('make', event.target.value)} />
                <input className={inputClass} placeholder="Model (e.g. Corolla)" value={filters.model} onChange={(event) => updateFilter('model', event.target.value)} />
                <input className={inputClass} placeholder="Category (e.g. Sedan)" value={filters.category} onChange={(event) => updateFilter('category', event.target.value)} />
                <input
                  className={inputClass}
                  type="number"
                  min="0"
                  placeholder="Min price"
                  value={filters.min_price}
                  onChange={(event) => updateFilter('min_price', event.target.value)}
                />
                <input
                  className={inputClass}
                  type="number"
                  min="0"
                  placeholder="Max price"
                  value={filters.max_price}
                  onChange={(event) => updateFilter('max_price', event.target.value)}
                />
                <div className="flex gap-3 md:col-span-3">
                  <button type="submit" disabled={busy} className={primaryButton}>Search</button>
                  <button
                    type="button"
                    className={outlineButton}
                    onClick={() => {
                      const empty = { make: '', model: '', category: '', min_price: '', max_price: '' }
                      setFilters(empty)
                      loadVehicles(empty)
                    }}
                  >
                    Clear filters
                  </button>
                </div>
              </form>
            </section>

            {isAdmin && (
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <p className="text-xs font-bold tracking-[0.2em] text-blue-600">ADMIN TOOLS</p>
                <h2 className="mt-2 text-xl font-extrabold text-slate-900">
                  {form.id ? 'Edit vehicle' : 'Add a vehicle'}
                </h2>
                <p className="mt-1 text-sm text-slate-500">Create a listing or edit an existing vehicle.</p>

                <form onSubmit={saveVehicle} className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <label className="mb-2 block text-sm font-semibold">Make</label>
                    <input className={inputClass} value={form.make} onChange={(event) => updateForm('make', event.target.value)} placeholder="Toyota" required maxLength={100} />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold">Model</label>
                    <input className={inputClass} value={form.model} onChange={(event) => updateForm('model', event.target.value)} placeholder="Corolla" required maxLength={100} />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold">Category</label>
                    <input className={inputClass} value={form.category} onChange={(event) => updateForm('category', event.target.value)} placeholder="Sedan" required maxLength={50} />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold">Price (₹)</label>
                    <input className={inputClass} type="number" min="0.01" step="0.01" value={form.price} onChange={(event) => updateForm('price', event.target.value)} placeholder="250000" required />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold">Quantity</label>
                    <input className={inputClass} type="number" min="0" step="1" value={form.quantity} onChange={(event) => updateForm('quantity', event.target.value)} placeholder="5" required />
                  </div>
                  <div className="flex items-end gap-3">
                    <button type="submit" disabled={busy} className={primaryButton}>
                      {busy ? 'Saving...' : form.id ? 'Save changes' : 'Add vehicle'}
                    </button>
                    {form.id && (
                      <button type="button" className={outlineButton} onClick={resetForm}>
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </section>
            )}

            <section>
              <div className="mb-5">
                <h2 className="text-xl font-extrabold text-slate-900">All vehicles</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {vehicles.length} vehicle model{vehicles.length === 1 ? '' : 's'} found
                </p>
              </div>

              {vehicles.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
                  <div className="text-4xl">🚘</div>
                  <h3 className="mt-4 text-lg font-bold text-slate-900">No vehicles found</h3>
                  <p className="mt-2 text-sm text-slate-500">Try different filters or add a vehicle if you have admin access.</p>
                </div>
              ) : (
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {vehicles.map((vehicle) => {
                    const out = vehicle.quantity === 0

                    return (
                      <article key={vehicle.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                        <div className="h-2 bg-gradient-to-r from-blue-600 via-indigo-500 to-sky-400" />
                        <div className="p-5">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-xs font-bold uppercase tracking-wider text-blue-600">{vehicle.category}</p>
                              <h3 className="mt-2 text-xl font-extrabold text-slate-900">{vehicle.make} {vehicle.model}</h3>
                            </div>
                            <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${out ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                              {out ? 'OUT OF STOCK' : 'IN STOCK'}
                            </span>
                          </div>

                          <p className="mt-6 text-2xl font-black tracking-tight text-slate-950">{money(vehicle.price)}</p>
                          <p className="mt-2 text-sm text-slate-500">Available units: <strong className="text-slate-800">{vehicle.quantity}</strong></p>

                          <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                            <button className={`${primaryButton} flex-1`} disabled={out || busy} onClick={() => vehicleAction('purchase', vehicle)}>Purchase</button>
                            {isAdmin && (
                              <>
                                <button className={outlineButton} onClick={() => vehicleAction('edit', vehicle)}>Edit</button>
                                <button className="rounded-xl bg-amber-50 px-3 py-3 text-sm font-semibold text-amber-800 hover:bg-amber-100" onClick={() => vehicleAction('restock', vehicle)}>Restock</button>
                                <button className="rounded-xl bg-red-50 px-3 py-3 text-sm font-semibold text-red-700 hover:bg-red-100" onClick={() => vehicleAction('delete', vehicle)}>Delete</button>
                              </>
                            )}
                          </div>
                        </div>
                      </article>
                    )
                  })}
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white px-5 py-6 text-center text-sm text-slate-500">
        DriveHub · Car Dealership Inventory System
      </footer>
    </div>
  )
}

function StatCard({ title, value, subtitle }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-slate-500">{title}</p>
      <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
    </article>
  )
}

export default App
