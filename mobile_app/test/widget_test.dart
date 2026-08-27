import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_app/main.dart';

void main() {
  testWidgets('FlashSaleApp smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const FlashSaleApp());
    expect(find.byType(FlashSaleApp), findsOneWidget);
  });
}
