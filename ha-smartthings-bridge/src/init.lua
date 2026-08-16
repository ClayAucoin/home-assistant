local capabilities = require "st.capabilities"
local Driver = require "st.driver"
local log = require "log"

local DEVICE_NETWORK_ID = "ha-contact-sensor-1"

local function device_exists(driver)
    for _, device in ipairs(driver:get_devices()) do
        if device.device_network_id == DEVICE_NETWORK_ID then return true end
    end

    return false
end

local function discovery_handler(driver, opts, should_continue)
    log.info("Discovery started")

    if not device_exists(driver) then
        local metadata = {
            type = "LAN",
            device_network_id = DEVICE_NETWORK_ID,
            label = "HA Door Contact",
            profile = "ha-contact-sensor",
            manufacturer = "Home Assistant",
            model = "HA Contact Bridge",
            vendor_provided_label = "HA Door Contact"
        }

        driver:try_create_device(metadata)
    end
end

local function device_added(driver, device)
    log.info("Device added: " .. device.label)

    -- Start in the closed state.
    device:emit_event(capabilities.contactSensor.contact.closed())
end

local driver = Driver("ha-smartthings-bridge", {
    discovery = discovery_handler,

    lifecycle_handlers = {added = device_added},

    supported_capabilities = {capabilities.contactSensor}
})

driver:run()
