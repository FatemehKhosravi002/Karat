from django.urls import path

from .views import TaskDetailView, TasksListView, TaskCompletedListView, TaskSoftDeletedListView

urlpatterns=[
    path("tasks/", TasksListView.as_view(), name="tasks_list"),
    path("tasks/<int:pk>/", TaskDetailView.as_view(), name="task_detail"),
    path("tasks/deleted/", TaskSoftDeletedListView.as_view(), name="task_soft_deleted_list_view"),
    path("tasks/completed/", TaskCompletedListView.as_view(), name="task_completed_list_view"),
]