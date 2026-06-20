from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from products.models import Category, Product

User = get_user_model()

CATEGORIES = [
    "Electronics",
    "Home & Kitchen",
    "Books",
    "Apparel",
    "Sports & Outdoors",
    "Skincare & Beauty",
    "Footwear",
    "Toys & Games",
    "Grocery & Food",
    "Health & Wellness",
    "Furniture",
    "Jewellery & Accessories",
    "Stationery",
]

PRODUCTS = [
    ("Wireless Headphones", "Electronics", "Over-ear headphones with active noise cancellation.", 79.99, 25),
    ("Mechanical Keyboard", "Electronics", "Hot-swappable mechanical keyboard with RGB backlight.", 109.50, 15),
    ("Smart LED Desk Lamp", "Electronics", "Dimmable desk lamp with USB charging port.", 34.99, 40),
    ("Stainless Steel Cookware Set", "Home & Kitchen", "10-piece cookware set, dishwasher safe.", 149.00, 10),
    ("Ceramic Coffee Mug Set", "Home & Kitchen", "Set of 4 hand-glazed ceramic mugs.", 24.00, 60),
    ("Cordless Stick Vacuum", "Home & Kitchen", "Lightweight cordless vacuum with HEPA filter.", 189.99, 8),
    ("The Pragmatic Programmer", "Books", "Classic guide to software craftsmanship.", 39.95, 30),
    ("Atomic Habits", "Books", "Practical strategies for building good habits.", 18.99, 50),
    ("Cotton Crewneck T-Shirt", "Apparel", "Soft 100% cotton t-shirt, unisex fit.", 14.99, 100),
    ("Insulated Rain Jacket", "Apparel", "Waterproof jacket with breathable lining.", 89.00, 20),
    ("Trail Running Shoes", "Sports & Outdoors", "Lightweight shoes with grippy outsole.", 99.99, 18),
    ("4-Person Camping Tent", "Sports & Outdoors", "Weatherproof tent, sets up in under 5 minutes.", 129.99, 12),
]


class Command(BaseCommand):
    help = "Seeds the database with demo categories, products, an admin user, and a customer user."

    def handle(self, *args, **options):
        category_objs = {}
        for name in CATEGORIES:
            category, created = Category.objects.get_or_create(name=name)
            category_objs[name] = category
            if created:
                self.stdout.write(f"Created category: {name}")

        for name, cat_name, description, price, stock in PRODUCTS:
            product, created = Product.objects.get_or_create(
                name=name,
                defaults={
                    "category": category_objs[cat_name],
                    "description": description,
                    "price": price,
                    "stock": stock,
                },
            )
            if created:
                self.stdout.write(f"Created product: {name}")

        admin, created = User.objects.get_or_create(
            username="admin",
            defaults={"email": "admin@gmail.com", "role": "admin"},
        )
        admin.set_password("admin@12345")
        admin.email = "admin@gmail.com"
        admin.role = "admin"
        admin.save()
        self.stdout.write(self.style.SUCCESS("Admin user ready -> username: admin / password: admin@12345"))

        if not User.objects.filter(username="Taylor").exists():
            User.objects.create_user(
                username="Taylor", email="Taylor@gmail.com", password="taylor12345", role="customer"
            )
            self.stdout.write(
                self.style.SUCCESS("Created demo customer -> username: Taylor / password: CustomerPass123!")
            )
        else:
            self.stdout.write("Taylor already exists, skipping.")

        if not User.objects.filter(username="Aarna").exists():
            User.objects.create_user(
                username="Aarna", email="aarna@example.com", password="aarna12345", role="customer"
            )
            self.stdout.write(self.style.SUCCESS("Created customer -> username: Aarna / password: aarna12345"))
        else:
            self.stdout.write("Aarna already exists, skipping.")

        self.stdout.write(self.style.SUCCESS("Seeding complete."))
