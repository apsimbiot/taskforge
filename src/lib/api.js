"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CUSTOM_FIELD_TYPES = void 0;
exports.fetchWorkspaces = fetchWorkspaces;
exports.createWorkspace = createWorkspace;
exports.updateWorkspace = updateWorkspace;
exports.fetchSpaces = fetchSpaces;
exports.fetchSpace = fetchSpace;
exports.createSpace = createSpace;
exports.fetchFolders = fetchFolders;
exports.createFolder = createFolder;
exports.fetchFolderLists = fetchFolderLists;
exports.fetchSpaceLists = fetchSpaceLists;
exports.fetchList = fetchList;
exports.createList = createList;
exports.fetchTasks = fetchTasks;
exports.createTask = createTask;
exports.updateTask = updateTask;
exports.deleteTask = deleteTask;
exports.fetchStatuses = fetchStatuses;
exports.createStatus = createStatus;
exports.updateStatus = updateStatus;
exports.deleteStatus = deleteStatus;
exports.reorderStatuses = reorderStatuses;
exports.fetchSprints = fetchSprints;
exports.fetchSprint = fetchSprint;
exports.createSprint = createSprint;
exports.updateSprint = updateSprint;
exports.deleteSprint = deleteSprint;
exports.addTaskToSprint = addTaskToSprint;
exports.removeTaskFromSprint = removeTaskFromSprint;
exports.moveTaskBetweenSprints = moveTaskBetweenSprints;
exports.fetchNotifications = fetchNotifications;
exports.markNotificationRead = markNotificationRead;
exports.markAllNotificationsRead = markAllNotificationsRead;
exports.fetchDashboardStats = fetchDashboardStats;
exports.fetchWorkspaceMembers = fetchWorkspaceMembers;
exports.addWorkspaceMember = addWorkspaceMember;
exports.updateWorkspaceMemberRole = updateWorkspaceMemberRole;
exports.removeWorkspaceMember = removeWorkspaceMember;
exports.fetchTaskAssignees = fetchTaskAssignees;
exports.addTaskAssignee = addTaskAssignee;
exports.removeTaskAssignee = removeTaskAssignee;
exports.fetchSubtasks = fetchSubtasks;
exports.createSubtask = createSubtask;
exports.toggleSubtask = toggleSubtask;
exports.deleteSubtask = deleteSubtask;
exports.fetchComments = fetchComments;
exports.createComment = createComment;
exports.deleteComment = deleteComment;
exports.fetchTaskDependencies = fetchTaskDependencies;
exports.fetchCustomFields = fetchCustomFields;
exports.createCustomField = createCustomField;
exports.updateCustomField = updateCustomField;
exports.deleteCustomField = deleteCustomField;
exports.fetchTaskSprint = fetchTaskSprint;
exports.assignTaskToSprint = assignTaskToSprint;
exports.removeTaskFromAllSprints = removeTaskFromAllSprints;
var BASE_URL = "/api";
function fetchJSON(url, init) {
    return __awaiter(this, void 0, void 0, function () {
        var res, error;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fetch("".concat(BASE_URL).concat(url), __assign({ credentials: "include", headers: __assign({ "Content-Type": "application/json" }, init === null || init === void 0 ? void 0 : init.headers) }, init))];
                case 1:
                    res = _a.sent();
                    if (!!res.ok) return [3 /*break*/, 3];
                    return [4 /*yield*/, res.json().catch(function () { return ({ error: "Unknown error" }); })];
                case 2:
                    error = _a.sent();
                    throw new Error(error.error || "HTTP ".concat(res.status));
                case 3: return [2 /*return*/, res.json()];
            }
        });
    });
}
function fetchWorkspaces() {
    return __awaiter(this, void 0, void 0, function () {
        var data;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fetchJSON("/workspaces")];
                case 1:
                    data = _a.sent();
                    return [2 /*return*/, data.workspaces];
            }
        });
    });
}
function createWorkspace(data) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, fetchJSON("/workspaces", {
                    method: "POST",
                    body: JSON.stringify(data),
                })];
        });
    });
}
function updateWorkspace(workspaceId, data) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, fetchJSON("/workspaces/".concat(workspaceId), {
                    method: "PATCH",
                    body: JSON.stringify(data),
                })];
        });
    });
}
function fetchSpaces(workspaceId) {
    return __awaiter(this, void 0, void 0, function () {
        var data;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fetchJSON("/workspaces/".concat(workspaceId, "/spaces"))];
                case 1:
                    data = _a.sent();
                    return [2 /*return*/, data.spaces];
            }
        });
    });
}
function fetchSpace(spaceId) {
    return __awaiter(this, void 0, void 0, function () {
        var data;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fetchJSON("/spaces/".concat(spaceId))];
                case 1:
                    data = _a.sent();
                    return [2 /*return*/, data.space];
            }
        });
    });
}
function createSpace(workspaceId, data) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, fetchJSON("/workspaces/".concat(workspaceId, "/spaces"), {
                    method: "POST",
                    body: JSON.stringify(data),
                })];
        });
    });
}
function fetchFolders(spaceId) {
    return __awaiter(this, void 0, void 0, function () {
        var data;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fetchJSON("/spaces/".concat(spaceId, "/folders"))];
                case 1:
                    data = _a.sent();
                    return [2 /*return*/, data.folders];
            }
        });
    });
}
function createFolder(spaceId, data) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, fetchJSON("/spaces/".concat(spaceId, "/folders"), {
                    method: "POST",
                    body: JSON.stringify(data),
                })];
        });
    });
}
function fetchFolderLists(folderId) {
    return __awaiter(this, void 0, void 0, function () {
        var data;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fetchJSON("/folders/".concat(folderId, "/lists"))];
                case 1:
                    data = _a.sent();
                    return [2 /*return*/, data.lists];
            }
        });
    });
}
function fetchSpaceLists(spaceId) {
    return __awaiter(this, void 0, void 0, function () {
        var data;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fetchJSON("/spaces/".concat(spaceId, "/lists"))];
                case 1:
                    data = _a.sent();
                    return [2 /*return*/, data.lists];
            }
        });
    });
}
function fetchList(listId) {
    return __awaiter(this, void 0, void 0, function () {
        var data;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fetchJSON("/lists/".concat(listId))];
                case 1:
                    data = _a.sent();
                    return [2 /*return*/, data.list];
            }
        });
    });
}
function createList(folderId, data) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, fetchJSON("/folders/".concat(folderId, "/lists"), {
                    method: "POST",
                    body: JSON.stringify(data),
                })];
        });
    });
}
function fetchTasks(listId) {
    return __awaiter(this, void 0, void 0, function () {
        var data;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fetchJSON("/lists/".concat(listId, "/tasks"))];
                case 1:
                    data = _a.sent();
                    return [2 /*return*/, data.tasks];
            }
        });
    });
}
function createTask(listId, data) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, fetchJSON("/lists/".concat(listId, "/tasks"), {
                    method: "POST",
                    body: JSON.stringify(data),
                })];
        });
    });
}
function updateTask(taskId, data) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, fetchJSON("/tasks/".concat(taskId), {
                    method: "PATCH",
                    body: JSON.stringify(data),
                })];
        });
    });
}
function deleteTask(taskId) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, fetchJSON("/tasks/".concat(taskId), {
                    method: "DELETE",
                })];
        });
    });
}
function fetchStatuses(listId) {
    return __awaiter(this, void 0, void 0, function () {
        var data;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fetchJSON("/lists/".concat(listId, "/statuses"))];
                case 1:
                    data = _a.sent();
                    return [2 /*return*/, data.statuses];
            }
        });
    });
}
function createStatus(listId, data) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, fetchJSON("/lists/".concat(listId, "/statuses"), {
                    method: "POST",
                    body: JSON.stringify(data),
                })];
        });
    });
}
function updateStatus(listId, statusId, data) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, fetchJSON("/lists/".concat(listId, "/statuses/").concat(statusId), {
                    method: "PUT",
                    body: JSON.stringify(data),
                })];
        });
    });
}
function deleteStatus(listId, statusId) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, fetchJSON("/lists/".concat(listId, "/statuses/").concat(statusId), {
                    method: "DELETE",
                })];
        });
    });
}
function reorderStatuses(listId, statusIds) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, fetchJSON("/lists/".concat(listId, "/statuses/reorder"), {
                    method: "PUT",
                    body: JSON.stringify({ statusIds: statusIds }),
                })];
        });
    });
}
function fetchSprints(workspaceId) {
    return __awaiter(this, void 0, void 0, function () {
        var data;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fetchJSON("/workspaces/".concat(workspaceId, "/sprints"))];
                case 1:
                    data = _a.sent();
                    return [2 /*return*/, data.sprints];
            }
        });
    });
}
function fetchSprint(sprintId) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, fetchJSON("/sprints/".concat(sprintId))];
        });
    });
}
function createSprint(workspaceId, data) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, fetchJSON("/workspaces/".concat(workspaceId, "/sprints"), {
                    method: "POST",
                    body: JSON.stringify(data),
                })];
        });
    });
}
function updateSprint(sprintId, data) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, fetchJSON("/sprints/".concat(sprintId), {
                    method: "PATCH",
                    body: JSON.stringify(data),
                })];
        });
    });
}
function deleteSprint(sprintId) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fetchJSON("/sprints/".concat(sprintId), { method: "DELETE" })];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function addTaskToSprint(sprintId, taskId) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fetchJSON("/sprints/".concat(sprintId, "/tasks"), {
                        method: "POST",
                        body: JSON.stringify({ taskId: taskId }),
                    })];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function removeTaskFromSprint(sprintId, taskId) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fetchJSON("/sprints/".concat(sprintId, "/tasks/").concat(taskId), {
                        method: "DELETE",
                    })];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function moveTaskBetweenSprints(fromSprintId, toSprintId, taskId) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: 
                // First remove from old sprint, then add to new (ensures move behavior)
                return [4 /*yield*/, fetchJSON("/sprint-tasks/move", {
                        method: "PUT",
                        body: JSON.stringify({ fromSprintId: fromSprintId, toSprintId: toSprintId, taskId: taskId }),
                    })];
                case 1:
                    // First remove from old sprint, then add to new (ensures move behavior)
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function fetchNotifications() {
    return __awaiter(this, arguments, void 0, function (unreadOnly) {
        var url;
        if (unreadOnly === void 0) { unreadOnly = false; }
        return __generator(this, function (_a) {
            url = unreadOnly ? "/notifications?unread=true" : "/notifications";
            return [2 /*return*/, fetchJSON(url)];
        });
    });
}
function markNotificationRead(notificationId) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fetchJSON("/notifications", {
                        method: "PATCH",
                        body: JSON.stringify({ notificationId: notificationId }),
                    })];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function markAllNotificationsRead() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fetchJSON("/notifications", {
                        method: "PATCH",
                        body: JSON.stringify({ markAllRead: true }),
                    })];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function fetchDashboardStats(workspaceId) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, fetchJSON("/workspaces/".concat(workspaceId, "/dashboard"))];
        });
    });
}
function fetchWorkspaceMembers(workspaceId, query) {
    return __awaiter(this, void 0, void 0, function () {
        var url, data;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    url = query ? "/workspaces/".concat(workspaceId, "/members?q=").concat(encodeURIComponent(query)) : "/workspaces/".concat(workspaceId, "/members");
                    return [4 /*yield*/, fetchJSON(url)];
                case 1:
                    data = _a.sent();
                    return [2 /*return*/, data.members];
            }
        });
    });
}
function addWorkspaceMember(workspaceId, email, role) {
    return __awaiter(this, void 0, void 0, function () {
        var data;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fetchJSON("/workspaces/".concat(workspaceId, "/members"), {
                        method: "POST",
                        body: JSON.stringify({ email: email, role: role }),
                    })];
                case 1:
                    data = _a.sent();
                    return [2 /*return*/, data.member];
            }
        });
    });
}
function updateWorkspaceMemberRole(workspaceId, userId, role) {
    return __awaiter(this, void 0, void 0, function () {
        var data;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fetchJSON("/workspaces/".concat(workspaceId, "/members/").concat(userId), {
                        method: "PATCH",
                        body: JSON.stringify({ role: role }),
                    })];
                case 1:
                    data = _a.sent();
                    return [2 /*return*/, data.member];
            }
        });
    });
}
function removeWorkspaceMember(workspaceId, userId) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, fetchJSON("/workspaces/".concat(workspaceId, "/members/").concat(userId), {
                    method: "DELETE",
                })];
        });
    });
}
function fetchTaskAssignees(taskId) {
    return __awaiter(this, void 0, void 0, function () {
        var data;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fetchJSON("/tasks/".concat(taskId, "/assignees"))];
                case 1:
                    data = _a.sent();
                    return [2 /*return*/, data.assignees];
            }
        });
    });
}
function addTaskAssignee(taskId, userId) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, fetchJSON("/tasks/".concat(taskId, "/assignees"), {
                    method: "POST",
                    body: JSON.stringify({ userId: userId }),
                })];
        });
    });
}
function removeTaskAssignee(taskId, userId) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fetchJSON("/tasks/".concat(taskId, "/assignees?userId=").concat(userId), {
                        method: "DELETE",
                    })];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function fetchSubtasks(taskId) {
    return __awaiter(this, void 0, void 0, function () {
        var data;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fetchJSON("/tasks/".concat(taskId, "/subtasks"))];
                case 1:
                    data = _a.sent();
                    return [2 /*return*/, data.subtasks];
            }
        });
    });
}
function createSubtask(taskId, data) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, fetchJSON("/tasks/".concat(taskId, "/subtasks"), {
                    method: "POST",
                    body: JSON.stringify(data),
                })];
        });
    });
}
function toggleSubtask(taskId, subtaskId, completed) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, fetchJSON("/tasks/".concat(subtaskId), {
                    method: "PATCH",
                    body: JSON.stringify({ status: completed ? "done" : "todo" }),
                })];
        });
    });
}
function deleteSubtask(taskId, subtaskId) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fetchJSON("/tasks/".concat(taskId, "/subtasks?subtaskId=").concat(subtaskId), {
                        method: "DELETE",
                    })];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function fetchComments(taskId) {
    return __awaiter(this, void 0, void 0, function () {
        var data;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fetchJSON("/tasks/".concat(taskId, "/comments"))];
                case 1:
                    data = _a.sent();
                    return [2 /*return*/, data.comments];
            }
        });
    });
}
function createComment(taskId, content) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, fetchJSON("/tasks/".concat(taskId, "/comments"), {
                    method: "POST",
                    body: JSON.stringify({ content: content }),
                })];
        });
    });
}
function deleteComment(taskId, commentId) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fetchJSON("/tasks/".concat(taskId, "/comments?commentId=").concat(commentId), {
                        method: "DELETE",
                    })];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function fetchTaskDependencies(taskId) {
    return __awaiter(this, void 0, void 0, function () {
        var data;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fetchJSON("/tasks/".concat(taskId, "/dependencies"))];
                case 1:
                    data = _a.sent();
                    return [2 /*return*/, data];
            }
        });
    });
}
exports.CUSTOM_FIELD_TYPES = [
    { value: "text", label: "Text", description: "Single line text" },
    { value: "textarea", label: "Text Area", description: "Multi-line text" },
    { value: "number", label: "Number", description: "Numeric value" },
    { value: "date", label: "Date", description: "Date picker" },
    { value: "time", label: "Time", description: "Time picker" },
    { value: "datetime", label: "Date & Time", description: "Both date and time" },
    { value: "checkbox", label: "Checkbox", description: "Yes/No toggle" },
    { value: "select", label: "Select", description: "Dropdown with options" },
    { value: "multiSelect", label: "Multi-Select", description: "Multiple selections" },
    { value: "url", label: "URL", description: "Web address" },
    { value: "email", label: "Email", description: "Email address" },
    { value: "phone", label: "Phone", description: "Phone number" },
    { value: "currency", label: "Currency", description: "Money amount" },
    { value: "percentage", label: "Percentage", description: "Percentage value" },
    { value: "user", label: "User", description: "Assign to workspace member" },
];
function fetchCustomFields(listId) {
    return __awaiter(this, void 0, void 0, function () {
        var data;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fetchJSON("/lists/".concat(listId, "/custom-fields"))];
                case 1:
                    data = _a.sent();
                    return [2 /*return*/, data.fields];
            }
        });
    });
}
function createCustomField(listId, data) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, fetchJSON("/lists/".concat(listId, "/custom-fields"), {
                    method: "POST",
                    body: JSON.stringify(data),
                })];
        });
    });
}
function updateCustomField(listId, fieldId, data) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, fetchJSON("/lists/".concat(listId, "/custom-fields/").concat(fieldId), {
                    method: "PUT",
                    body: JSON.stringify(data),
                })];
        });
    });
}
function deleteCustomField(listId, fieldId) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fetchJSON("/lists/".concat(listId, "/custom-fields/").concat(fieldId), {
                        method: "DELETE",
                    })];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function fetchTaskSprint(taskId) {
    return __awaiter(this, void 0, void 0, function () {
        var data;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fetchJSON("/tasks/".concat(taskId, "/sprint"))];
                case 1:
                    data = _a.sent();
                    return [2 /*return*/, data.sprints[0] || null];
            }
        });
    });
}
function assignTaskToSprint(taskId, sprintId) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, fetchJSON("/tasks/".concat(taskId, "/sprint"), {
                    method: "PUT",
                    body: JSON.stringify({ sprintId: sprintId }),
                })];
        });
    });
}
function removeTaskFromAllSprints(taskId) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, fetchJSON("/tasks/".concat(taskId, "/sprint"), {
                    method: "DELETE",
                })];
        });
    });
}
