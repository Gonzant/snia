/*jslint browser: true*/
/*global document, alert, require*/

/*
 * js/snia/app
 * 
 * Nota: El código fuente JavaScript de este documento puede ser copiado y
 * reutilizado sin ninguna restricción.
 */
var snia;
if (!snia) {
    snia = {};
}
snia.app = {
    iniciar : function () {
        "use strict";
        require(["dojo/on",
            "dojo/dom",
            "dojo/parser",
            "dojo/_base/lang",
            "dojo/_base/array",
            "dojo/json",
            "dojox/widget/Standby",
            "esri/config",
            "esri/layers/ArcGISTiledMapServiceLayer",
            "esri/layers/ArcGISDynamicMapServiceLayer",
            "esri/layers/WMSLayer",
            "modulos/HerramientaDialog",
            "widgets/BarraHerramientasWidget",
            "widgets/MapaWidget",
            "dojo/text!config/app.json",
            "dojo/text!config/mapa.json",
            "dojo/text!config/tool.json",
            "dojo/dom-style",
            "esri/urlUtils",
            "esri/geometry/Extent",
            "dojo/domReady!"], function (on, dom, parser, lang, arrayUtil, JSON, Standby,
            esriConfig, ArcGISTiledMapServiceLayer, ArcGISDynamicMapServiceLayer, WMSLayer,
            HerramientaDialog,
            BarraHerramientasWidget,
            MapaWidget, appConfigJSON, mapaConfigJSON, toolConfigJSON,
            domStyle, urlUtils, Extent) {
            //variables
            var
                standby, appConfig, mapa, mapaConfig, toolConfig,
                barra,
                initCapas, initControles;
            //metodos
            initCapas = function () {
                //dynamicLayers
                var dynLayers = mapaConfig.mapa.dynamicLayers, l;
                esriConfig.defaults.io.corsEnabledServers.push("web.renare.gub.uy");
                esriConfig.defaults.io.corsEnabledServers.push("http://dlibrary.snia.gub.uy");
                arrayUtil.forEach(dynLayers, function (dataLayer, index) {
                    if (dataLayer.url) { //Nodo a partir de un map service
                        var l;
                        if (dataLayer.wms) {
                            l = new WMSLayer(dataLayer.url, dataLayer.options);
                        } else {
                            l = new ArcGISDynamicMapServiceLayer(dataLayer.url, dataLayer.options);
                        }
                        if (index === 0) {
                            //Mapa base
                            mapa.agregarCapa(l);
                        } else {
                            //Agregar capas de forma que las de mas arriba en la conf se muestren en el mapa por encima que las de mas abajo
                            mapa.agregarCapa(l, 1);
                        }
                    } else if (dataLayer.multiple) { //Nodo a partir de varios map services
                        arrayUtil.forEach(dataLayer.multiple, function (dataLayer2) {
                            var dataLayerOptions = lang.clone(dataLayer.options);
                            dataLayerOptions.id = dataLayer.options.id + dataLayer2.url;
                            if (dataLayer2.wms) {
                                l = new WMSLayer(dataLayer2.url, dataLayerOptions);
                            } else {
                                l = new ArcGISDynamicMapServiceLayer(dataLayer2.url, dataLayerOptions);
                            }
                            
                            mapa.agregarCapa(l);
                        });
                    }
                });
            };
            initControles = function () {
                dom.byId("divToolbarTitulo").innerHTML = appConfig.app.titulo;
                standby.set("text", "Cargando librerias...");
                var widgetNames = arrayUtil.map(toolConfig.barraHerramientas, function (herramientaConfig) {
                    return herramientaConfig.widget;
                });
                require(widgetNames, function () {
                    var herramientas = [];
                    arrayUtil.forEach(toolConfig.barraHerramientas, function (herramientaConfig) {
                        standby.set("text", "Iniciando " + herramientaConfig.title + "...");
                        var WidgetClass = require(herramientaConfig.widget),
                            widgetConfig = herramientaConfig.widgetConfig,
                            title = herramientaConfig.title,
                            startsOpen = herramientaConfig.startsOpen,
                            icono = herramientaConfig.icono,
                            closable =  (typeof herramientaConfig.closable  === "undefined" ?  true : herramientaConfig.closable),
                            draggable = (typeof herramientaConfig.draggable  === "undefined" ?  true : herramientaConfig.draggable),
                            position = herramientaConfig.position,
                            msgToolTip = herramientaConfig.msgToolTip;
                        if (WidgetClass) {
                            herramientas.push({
                                herramienta: new HerramientaDialog({
                                    startsOpen: startsOpen,
                                    position: position,
                                    widget: new WidgetClass({ mapa: mapa, config: widgetConfig }),
                                    dialogParams: { title : title, closable: closable, draggable: draggable}
                                }),
                                etiqueta: title,
                                icono: icono,
                                msgToolTip: msgToolTip
                            });
                        }
                    });
                    barra = new BarraHerramientasWidget({
                        herramientasOptions: herramientas,
                        vertical: false
                    }, 'divToolbar');
                    barra.startup();
                });
            };
            //comienzo
            parser.parse();
            standby = new Standby({
                target: dom.byId("divStandby"),
                color: 'lightgray',
                centerIndicator: 'text'
            });
            document.body.appendChild(standby.domNode);
            standby.startup();
            standby.set("text", "Cargando configuración ...");
            standby.show();
            appConfig = JSON.parse(appConfigJSON);
            standby.set("text", "Cargando mapa ...");
            if (appConfig.app.proxyRules.length > 0) {
                arrayUtil.forEach(appConfig.app.proxyRules, function (rule) {
                    urlUtils.addProxyRule(rule);
                });
            }
            //mapa
            mapaConfig = JSON.parse(mapaConfigJSON);
            mapa = new MapaWidget({
                mapOptions : {
                    slider: false,
                    logo: false,
                    extent: new Extent(mapaConfig.mapa.baseMapLayer.extent)
                },
                baseMapLayer: new ArcGISTiledMapServiceLayer(mapaConfig.mapa.baseMapLayer.url)
            }, "divMapa");
            //tool
            toolConfig = JSON.parse(toolConfigJSON);
            on(mapa, "load", function () {
                initCapas();
                initControles();
                standby.hide();
                domStyle.set(dom.byId('divContenedorIndex'), 'display', 'block');
            });
            mapa.startup();
        });
    }
};
snia.app.iniciar();
