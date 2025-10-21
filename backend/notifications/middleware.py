import jwt
from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken
from urllib.parse import parse_qs

User = get_user_model()


class JWTAuthMiddleware:
    """
    Custom middleware that authenticates WebSocket connections using JWT tokens.
    Token is expected in the query string as ?token=<JWT>
    """

    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        # Parse the token from the query string
        query_params = parse_qs(scope["query_string"].decode())
        token = query_params.get("token", [None])[0]

        scope["user"] = None

        if token:
            try:
                validated_token = AccessToken(token)
                user_id = validated_token.get("user_id")
                user = await self.get_user(user_id)
                scope["user"] = user
            except Exception as e:
                print("JWTAuthMiddleware error:", str(e))
                scope["user"] = None

        return await self.inner(scope, receive, send)

    @staticmethod
    async def get_user(user_id):
        try:
            return await User.objects.aget(pk=user_id)
        except User.DoesNotExist:
            return None


def JWTAuthMiddlewareStack(inner):
    """Helper to combine our middleware with Django's AuthMiddlewareStack"""
    from channels.auth import AuthMiddlewareStack

    return JWTAuthMiddleware(AuthMiddlewareStack(inner))
