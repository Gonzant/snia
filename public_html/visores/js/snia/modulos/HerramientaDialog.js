/*
 * js/sit/modulos/HerramientaDialog
 * 
 */
/*global define*/
/*jslint nomen: true*/
define([
    "dojo/Evented",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/dom-style",
    "dijit/Dialog"
], function (Evented, declare, lang, domStyle, Dialog) {
//    "use strict";
    return declare([Evented], {
        options : {
            modoToggle: false,
            startsOpen: false,
            widget: null,
            dialogParams: null,
            dialogSrcNodeRef: null
        },
        //privado
        _dialog: null,//Dialog
        _visible: false,
        //publico
        constructor : function (options) {
            //mezclar opciones usuario y default
            this.options = lang.mixin({}, this.options, options);
            if (this.options.widget) {
                var dialogParams = lang.mixin({}, this.options.dialogParams,
                    {
                        content: this.options.widget,
                        onHide: lang.hitch(this, this._dialogHide)
                    });
                this._dialog = new Dialog(dialogParams, this.options.dialogSrcNodeRef);
                this.options.widget.on('active-changed', lang.hitch(this, this._widgetActiveChanged));
                this.options.widget.on('dibujo-enabled-changed', lang.hitch(this, this._widgetDibujoEnabledChanged));
                this.canExecute = true;
                if (this.options.startsOpen) {
                   this.execute(); 
                }
            } else {
                this.canExecute = false;
            }
        },
        execute: function () {
            if (this.options.modoToggle && this._visible) {
                this._dialog.hide();
                this.options.widget.set('active', false);
            } else {
                this._dialog.show();
                this.options.widget.set('active', true);
                if (this.options.style) {
                    domStyle.set(this._dialog.domNode, this.options.style);
                }
            }
            this._visible = !this._visible;
            this._updateCanExecute();
        },
        //privadas
        _init: function () {
            
        },
        _widgetActiveChanged: function () {
            if (!this.options.widget.get('active') && this._visible) {
                this._dialog.hide();
                this._visible = false;
                this._updateCanExecute();
            }
        },
        _dialogHide: function () {
            this.options.widget.set('active', false);
            this._visible = false;
            this._updateCanExecute();
        },
        _updateCanExecute: function () {
            if (!this.options.modoToggle) {
                this.canExecute = !this._visible;
                this.emit("can-execute-changed", {});
            }
        },
        _widgetDibujoEnabledChanged: function () {
            this.options.widget.set('active', false);
        }
    });
});