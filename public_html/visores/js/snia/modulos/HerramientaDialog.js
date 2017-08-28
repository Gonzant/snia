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
            invisibleOpen: false,
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
                //Si se define una posicion fija no ubica el Dialog centrado
                if (this.options.position) {
                    this._dialog._position = lang.hitch(this, function () {
                        domStyle.set(this._dialog.domNode, this.options.position);
                    });
                }
                this.options.widget.on('active-changed', lang.hitch(this, this._widgetActiveChanged));
                this.options.widget.on('dibujo-enabled-changed', lang.hitch(this, this._widgetDibujoEnabledChanged));
                this.canExecute = true;
                if (this.options.startsOpen) {
                    this.execute();
                }
                if (this.options.invisibleOpen) {
                    this._visible = false;
                    this._dialog.hide();
                    this.options.widget.on('show-changed', lang.hitch(this, this._widgetShow));
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
        },
        _widgetShow: function () {
            this._dialog.show();
            this._visible = true;
        }
    });
});