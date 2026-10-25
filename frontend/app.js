
const API = "/api";

let token = "";
let currentRole = "";
let authMode = "login";
let vehicles = [];

const $ = (id) => document.getElementById(id);

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function money(value) {
    return Number(value).toLocaleString("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2
    });
}

async function apiRequest(path, options = {}) {
    const headers = { ...(options.headers || {}) };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    if (options.body) {
        headers["Content-Type"] = "application/json";
    }

    const response = await fetch(`${API}${path}`, {
        ...options,
        headers
    });

    if (response.status === 204) {
        if (!response.ok) throw new Error("Request failed");
        return null;
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.detail || `Request failed (${response.status})`);
    }

    return data;
}

function showMessage(elementId, message, type = "") {
    const element = $(elementId);
    element.textContent = message;
    element.className = `message ${type}`;
}

function setAuthMode(mode) {
    authMode = mode;
    const isLogin = mode === "login";

    $("login-tab").classList.toggle("active", isLogin);
    $("register-tab").classList.toggle("active", !isLogin);
    $("auth-title").textContent = isLogin ? "Welcome back" : "Create your account";
    $("auth-description").textContent = isLogin
        ? "Log in to access the inventory."
        : "Register to start exploring vehicles.";
    $("auth-submit").textContent = isLogin ? "Log in" : "Create account";
    $("password").minLength = isLogin ? 1 : 8;

    showMessage("auth-message", "");
}

$("login-tab").addEventListener("click", () => setAuthMode("login"));
$("register-tab").addEventListener("click", () => setAuthMode("register"));

$("auth-form").addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = $("email").value.trim().toLowerCase();
    const password = $("password").value;

    $("auth-submit").disabled = true;
    showMessage("auth-message", "");

    try {
        if (authMode === "register") {
            await apiRequest("/auth/register", {
                method: "POST",
                body: JSON.stringify({ email, password })
            });
        }

        const result = await apiRequest("/auth/login", {
            method: "POST",
            body: JSON.stringify({ email, password })
        });

        token = result.access_token;
        currentRole = result.role;

        $("user-label").textContent = `${result.email} · ${currentRole}`;
        $("auth-section").classList.add("hidden");
        $("dashboard").classList.remove("hidden");
        $("logout-btn").classList.remove("hidden");
        $("admin-panel").classList.toggle("hidden", currentRole !== "admin");

        await loadVehicles();
    } catch (error) {
        showMessage("auth-message", error.message, "error");
    } finally {
        $("auth-submit").disabled = false;
    }
});

function logout() {
    token = "";
    currentRole = "";
    vehicles = [];

    $("dashboard").classList.add("hidden");
    $("auth-section").classList.remove("hidden");
    $("logout-btn").classList.add("hidden");
    $("user-label").textContent = "Not logged in";
    $("password").value = "";
    $("email").value = "";
    $("vehicle-list").innerHTML = "";
    resetVehicleForm();
    setAuthMode("login");
}

$("logout-btn").addEventListener("click", logout);

function getSearchParams() {
    const params = new URLSearchParams();

    const make = $("search-make").value.trim();
    const model = $("search-model").value.trim();
    const category = $("search-category").value.trim();

    if (make) params.set("make", make);
    if (model) params.set("model", model);
    if (category) params.set("category", category);

    return params.toString();
}

async function loadVehicles() {
    $("refresh-btn").disabled = true;
    $("inventory-caption").textContent = "Loading inventory...";
    showMessage("inventory-message", "");

    try {
        const query = getSearchParams();
        const path = query
            ? `/vehicles/search?${query}`
            : "/vehicles";

        vehicles = await apiRequest(path);
        renderVehicles();
    } catch (error) {
        showMessage("inventory-message", error.message, "error");

        if (error.message.includes("token")) {
            logout();
        }
    } finally {
        $("refresh-btn").disabled = false;
    }
}

function renderVehicles() {
    const totalUnits = vehicles.reduce(
        (sum, vehicle) => sum + vehicle.quantity, 0
    );
    const outOfStock = vehicles.filter(
        (vehicle) => vehicle.quantity === 0
    ).length;

    $("model-count").textContent = vehicles.length;
    $("unit-count").textContent = totalUnits;
    $("out-count").textContent = outOfStock;
    $("inventory-caption").textContent =
        `${vehicles.length} vehicle model${vehicles.length === 1 ? "" : "s"} found`;

    if (vehicles.length === 0) {
        $("vehicle-list").innerHTML = `
            <div class="empty-state">
                <h3>No vehicles found</h3>
                <p>Try different filters or add a vehicle if you have admin access.</p>
            </div>`;
        return;
    }

    $("vehicle-list").innerHTML = vehicles.map((vehicle) => {
        const out = vehicle.quantity === 0;
        const admin = currentRole === "admin";

        return `
            <article class="vehicle-card">
                <div class="vehicle-card-top">
                    <div>
                        <h3>${escapeHtml(vehicle.make)} ${escapeHtml(vehicle.model)}</h3>
                        <p class="vehicle-category">${escapeHtml(vehicle.category)}</p>
                    </div>
                    <span class="stock-badge ${out ? "out" : ""}">
                        ${out ? "OUT OF STOCK" : "IN STOCK"}
                    </span>
                </div>

                <div class="vehicle-price">${money(vehicle.price)}</div>
                <div class="stock-info">Available units: ${vehicle.quantity}</div>

                <div class="vehicle-actions">
                    <button class="btn btn-primary" data-action="purchase"
                        data-id="${vehicle.id}" ${out ? "disabled" : ""}>
                        Purchase
                    </button>
                    ${admin ? `
                        <button class="btn btn-outline" data-action="edit"
                            data-id="${vehicle.id}">Edit</button>
                        <button class="btn btn-restock" data-action="restock"
                            data-id="${vehicle.id}">Restock</button>
                        <button class="btn btn-danger" data-action="delete"
                            data-id="${vehicle.id}">Delete</button>
                    ` : ""}
                </div>
            </article>`;
    }).join("");
}

$("vehicle-list").addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button || button.disabled) return;

    const id = Number(button.dataset.id);
    const action = button.dataset.action;
    const vehicle = vehicles.find((item) => item.id === id);

    if (!vehicle) return;

    try {
        if (action === "purchase") {
            if (!confirm(`Purchase one ${vehicle.make} ${vehicle.model}?`)) return;

            await apiRequest(`/vehicles/${id}/purchase`, {
                method: "POST"
            });
            showMessage("inventory-message", "Purchase completed.", "success");
            await loadVehicles();
        }

        if (action === "edit") {
            if (currentRole !== "admin") return;

            $("vehicle-id").value = vehicle.id;
            $("make").value = vehicle.make;
            $("model").value = vehicle.model;
            $("category").value = vehicle.category;
            $("price").value = vehicle.price;
            $("quantity").value = vehicle.quantity;

            $("vehicle-form-title").textContent = "Edit vehicle";
            $("save-vehicle-btn").textContent = "Save changes";
            $("cancel-edit-btn").classList.remove("hidden");
            $("admin-panel").scrollIntoView({ behavior: "smooth" });
        }

        if (action === "restock") {
            if (currentRole !== "admin") return;

            const answer = prompt("How many units should be added?", "1");
            if (answer === null) return;

            const quantity = Number(answer);
            if (!Number.isInteger(quantity) || quantity <= 0) {
                throw new Error("Enter a positive whole number.");
            }

            await apiRequest(`/vehicles/${id}/restock?quantity=${quantity}`, {
                method: "POST"
            });
            showMessage("inventory-message", "Vehicle restocked.", "success");
            await loadVehicles();
        }

        if (action === "delete") {
            if (currentRole !== "admin") return;
            if (!confirm(`Delete ${vehicle.make} ${vehicle.model}?`)) return;

            await apiRequest(`/vehicles/${id}`, { method: "DELETE" });
            showMessage("inventory-message", "Vehicle deleted.", "success");
            await loadVehicles();
        }
    } catch (error) {
        showMessage("inventory-message", error.message, "error");
    }
});

$("search-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    await loadVehicles();
});

$("clear-search").addEventListener("click", async () => {
    $("search-make").value = "";
    $("search-model").value = "";
    $("search-category").value = "";
    await loadVehicles();
});

$("refresh-btn").addEventListener("click", loadVehicles);

function resetVehicleForm() {
    $("vehicle-form").reset();
    $("vehicle-id").value = "";
    $("vehicle-form-title").textContent = "Add a vehicle";
    $("save-vehicle-btn").textContent = "Add vehicle";
    $("cancel-edit-btn").classList.add("hidden");
}

$("cancel-edit-btn").addEventListener("click", resetVehicleForm);

$("vehicle-form").addEventListener("submit", async (event) => {
    event.preventDefault();

    if (currentRole !== "admin") {
        showMessage("inventory-message", "Admin access required.", "error");
        return;
    }

    const id = $("vehicle-id").value;
    const payload = {
        make: $("make").value.trim(),
        model: $("model").value.trim(),
        category: $("category").value.trim(),
        price: Number($("price").value),
        quantity: Number($("quantity").value)
    };

    if (!Number.isFinite(payload.price) || payload.price <= 0 ||
        !Number.isInteger(payload.quantity) || payload.quantity < 0) {
        showMessage("inventory-message", "Enter a valid price and quantity.", "error");
        return;
    }

    $("save-vehicle-btn").disabled = true;

    try {
        await apiRequest(
            id ? `/vehicles/${id}` : "/vehicles",
            {
                method: id ? "PUT" : "POST",
                body: JSON.stringify(payload)
            }
        );

        resetVehicleForm();
        showMessage(
            "inventory-message",
            id ? "Vehicle updated successfully." : "Vehicle added successfully.",
            "success"
        );
        await loadVehicles();
    } catch (error) {
        showMessage("inventory-message", error.message, "error");
    } finally {
        $("save-vehicle-btn").disabled = false;
    }
});

setAuthMode("login");
