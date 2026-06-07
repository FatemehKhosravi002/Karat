from django.urls import path

from .views import TaskDetailView, TasksListView, TaskCompletedListView, TaskSoftDeletedListView

urlpatterns=[
    path("tasks/", TasksListView.as_view(), name="tasks_list"),
    path("tasks/<int:pk>/", TaskDetailView.as_view(), name="task_detail"),
    path("deleted/", TaskSoftDeletedListView.as_view(), name="task_soft_deleted_list_view"),
    path("deleted/<int:pk>/", TaskDetailView.as_view(), name="task_soft_deleted_detail_view"),
    path("completed/", TaskCompletedListView.as_view(), name="task_completed_list_view"),
    path("completed/<int:pk>/", TaskDetailView.as_view(), name="task_completed_detail_view"),
]