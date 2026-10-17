import os
from django.contrib import admin
from django.contrib.auth import get_user_model, password_validation
from django.core.exceptions import ValidationError as DjangoValidationError
from django.urls import include, path
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from rest_framework import status
from rest_framework.decorators import (
    api_view,
    permission_classes,
    throttle_classes,
    throttle_scope,
)
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import (
    TokenBlacklistView,
    TokenObtainPairView,
    TokenRefreshView,
)

class ThrottledTokenObtainPairView(TokenObtainPairView):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"


@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([ScopedRateThrottle])
@throttle_scope("login")
def google_login(request):
    client_id = os.getenv("GOOGLE_OAUTH_CLIENT_ID", "").strip()
    credential = request.data.get("credential", "")

    if not client_id:
        return Response(
            {
                "detail": (
                    "O login Google ainda não foi configurado "
                    "pelo administrador."
                )
            },
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    if not credential:
        return Response(
            {"detail": "Credencial Google ausente."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        token_data = id_token.verify_oauth2_token(
            credential,
            google_requests.Request(),
            client_id,
        )
    except ValueError:
        return Response(
            {"detail": "Credencial Google inválida ou expirada."},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    if not token_data.get("email_verified"):
        return Response(
            {"detail": "O Google não confirmou o e-mail desta conta."},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    email = token_data.get("email", "").lower()

    if not email:
        return Response(
            {"detail": "A conta Google não forneceu um e-mail."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    User = get_user_model()
    user = User.objects.filter(email__iexact=email).first()

    if user is None:
        return Response(
            {
                "detail": (
                    "Esta conta Google ainda não está autorizada. "
                    "Peça ao administrador para criar o usuário primeiro."
                )
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    if not user.is_active:
        return Response(
            {"detail": "Esta conta está desativada."},
            status=status.HTTP_403_FORBIDDEN,
        )

    refresh_token = RefreshToken.for_user(user)

    return Response(
        {
            "access": str(refresh_token.access_token),
            "refresh": str(refresh_token),
        }
    )


@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([ScopedRateThrottle])
@throttle_scope("register")
def register(request):
    username = str(request.data.get("username", "")).strip()
    email = str(request.data.get("email", "")).strip().lower()
    password = str(request.data.get("password", ""))

    if not username or not email or not password:
        return Response(
            {"detail": "Informe usuário, e-mail e senha."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if len(password) < 12:
        return Response(
            {"detail": "A senha deve ter pelo menos 12 caracteres."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    User = get_user_model()

    if User.objects.filter(username__iexact=username).exists():
        return Response(
            {"detail": "Este nome de usuário já está em uso."},
            status=status.HTTP_409_CONFLICT,
        )

    if User.objects.filter(email__iexact=email).exists():
        return Response(
            {"detail": "Este e-mail já possui uma conta ou solicitação."},
            status=status.HTTP_409_CONFLICT,
        )

    candidate = User(
        username=username,
        email=email,
        is_active=False,
        is_staff=False,
        is_superuser=False,
    )

    try:
        password_validation.validate_password(
            password,
            user=candidate,
        )
    except DjangoValidationError as exc:
        return Response(
            {"detail": list(exc.messages)},
            status=status.HTTP_400_BAD_REQUEST,
        )

    candidate.set_password(password)
    candidate.save()

    return Response(
        {
            "detail": (
                "Solicitação enviada. Um superadministrador precisa "
                "aprovar sua conta antes do primeiro acesso."
            )
        },
        status=status.HTTP_201_CREATED,
    )


urlpatterns = [
    path("admin/", admin.site.urls),
    path(
        "api/auth/token/",
        ThrottledTokenObtainPairView.as_view(),
    ),
    path("api/auth/google/", google_login),
    path("api/auth/register/", register),
    path("api/auth/refresh/", TokenRefreshView.as_view()),
    path("api/auth/logout/", TokenBlacklistView.as_view()),
    path("api/", include("tickets.urls")),
]