(function () {
    window.HluvValidators = {
        required(values) {
            return values.every((value) => String(value?.value ?? value ?? '').trim().length > 0);
        },
        email(value) {
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
        },
        accountName(value) {
            return /^[\p{L}\p{N}\s]{1,12}$/u.test(String(value || '').trim());
        }
    };
})();
