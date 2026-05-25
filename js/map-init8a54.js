/**
 * iis Leaflet Map Initialization
 * 
 * External JavaScript file for initializing Leaflet maps
 * Works in both frontend and Elementor editor
 */

(function($) {
    'use strict';

    /**
     * Initialize Leaflet Map
     */
    function initiisLeafletMap(mapElement) {
        // Check if Leaflet is loaded
        if (typeof L === 'undefined') {
            console.error('Leaflet library is not loaded');
            return;
        }

        // Check if map is already initialized
        if (mapElement.getAttribute('data-map-initialized') === 'true') {
            return;
        }

        // Get map configuration from data attribute
        var configAttr = mapElement.getAttribute('data-map-config');
        if (!configAttr) {
            console.error('Map configuration not found');
            return;
        }

        var config;
        try {
            config = JSON.parse(configAttr);
        } catch (e) {
            console.error('Failed to parse map configuration:', e);
            return;
        }

        // Mark as initialized
        mapElement.setAttribute('data-map-initialized', 'true');

        // Map options
        var mapOptions = {
            scrollWheelZoom: config.scrollWheelZoom,
            dragging: config.dragging,
            zoomControl: config.zoomControl,
            attributionControl: config.attributionControl
        };

        // Initialize map
        var map = L.map(config.mapId, mapOptions);

        // Add tile layer
        L.tileLayer(config.tileLayerUrl, {
            attribution: config.tileLayerAttribution,
            maxZoom: 18
        }).addTo(map);

        var markers = config.markers || [];
        var markerObjects = [];

        // Set initial view
        if (markers.length > 0) {
            map.setView([markers[0].lat, markers[0].lng], config.zoom);
        } else {
            map.setView([40.7128, -74.0060], config.zoom);
        }

        // Add markers
        markers.forEach(function(markerData, index) {
            if (!markerData.lat || !markerData.lng) {
                return;
            }

            var markerOptions = {};

            // Add custom icon if provided
            if (markerData.icon && markerData.icon.trim() !== '') {
                var customIcon = L.icon({
                    iconUrl: markerData.icon,
                    iconSize: [config.markerSize, config.markerSize],
                    iconAnchor: [config.markerSize / 2, config.markerSize],
                    popupAnchor: [0, -config.markerSize]
                });
                markerOptions.icon = customIcon;
            }

            // Create marker
            var marker = L.marker([markerData.lat, markerData.lng], markerOptions).addTo(map);

            // Bind popup if content exists
            if (markerData.content && markerData.content.trim() !== '') {
                marker.bindPopup(markerData.content, {
                    maxWidth: config.popupMaxWidth
                });
            }

            markerObjects.push(marker);
        });

        // Open initial marker popup if specified
        var initialMarker = config.initialMarker;
        if (initialMarker >= 0 && initialMarker < markerObjects.length && 
            markers[initialMarker] && markers[initialMarker].content && 
            markers[initialMarker].content.trim() !== '') {
            markerObjects[initialMarker].openPopup();
        }

        // Auto fit bounds if enabled and multiple markers exist
        if (config.autoFitBounds && markerObjects.length > 1) {
            var bounds = L.featureGroup(markerObjects).getBounds();
            map.fitBounds(bounds);
        }

        // Invalidate size to fix display issues
        setTimeout(function() {
            map.invalidateSize();
        }, 100);

        // Store map instance for potential later use
        mapElement._leafletMap = map;
    }

    /**
     * Initialize all maps on the page
     */
    function initAllMaps() {
        $('.iis-leaflet-map').each(function() {
            initiisLeafletMap(this);
        });
    }

    /**
     * Initialize maps on document ready
     */
    $(document).ready(function() {
        // Wait for Leaflet to be loaded
        function waitForLeaflet() {
            if (typeof L !== 'undefined') {
                initAllMaps();
            } else {
                setTimeout(waitForLeaflet, 100);
            }
        }
        waitForLeaflet();
    });

    /**
     * Initialize maps in Elementor editor
     */
    $(window).on('elementor/frontend/init', function() {
        // For Elementor editor
        if (typeof elementorFrontend !== 'undefined') {
            elementorFrontend.hooks.addAction('frontend/element_ready/iis_leaflet_maps.default', function($scope) {
                var mapElement = $scope.find('.iis-leaflet-map')[0];
                if (mapElement) {
                    // Wait a bit for Leaflet to load
                    setTimeout(function() {
                        initiisLeafletMap(mapElement);
                    }, 300);
                }
            });
        }
    });

    /**
     * Re-initialize maps after Elementor preview refresh
     */
    $(window).on('load', function() {
        // Additional initialization for any maps that might have been missed
        setTimeout(function() {
            $('.iis-leaflet-map:not([data-map-initialized="true"])').each(function() {
                initiisLeafletMap(this);
            });
        }, 500);
    });

})(jQuery);