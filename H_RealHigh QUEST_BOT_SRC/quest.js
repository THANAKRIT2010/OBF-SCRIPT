"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Quest = void 0;
class Quest {
    constructor(data) {
        this.data = data;
    }
    static create(data) {
        return new Quest(data);
    }
    get id() {
        return this.data.id;
    }
    get config() {
        return this.data.config;
    }
    get userStatus() {
        return this.data.user_status;
    }
    get targetedContent() {
        return this.data.targeted_content;
    }
    get preview() {
        return this.data.preview;
    }
    isExpired(reference = new Date()) {
        return reference.getTime() > new Date(this.data.config.expires_at).getTime();
    }
    isCompleted() {
        var _a;
        return Boolean((_a = this.userStatus) === null || _a === void 0 ? void 0 : _a.completed_at);
    }
    isEnrolledQuest() {
        var _a;
        return Boolean((_a = this.userStatus) === null || _a === void 0 ? void 0 : _a.enrolled_at);
    }
    hasClaimedRewards() {
        var _a;
        return Boolean((_a = this.userStatus) === null || _a === void 0 ? void 0 : _a.claimed_at);
    }
    updateUserStatus(input) {
        if (!input)
            return;
        if (input.user_status) {
            this.data.user_status = input.user_status;
        }
        else if (input.progress || input.enrolled_at) {
            this.data.user_status = input;
        }
        else {
            this.data.user_status = Object.assign(Object.assign({}, this.data.user_status), input);
        }
    }
}
exports.Quest = Quest;
