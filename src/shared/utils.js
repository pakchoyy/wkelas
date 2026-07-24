"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nowISO = nowISO;
exports.todayISO = todayISO;
exports.formatDate = formatDate;
function nowISO() {
    return new Date().toISOString();
}
function todayISO() {
    return new Date().toISOString().split('T')[0];
}
function formatDate(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}
