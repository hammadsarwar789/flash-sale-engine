import 'package:intl/intl.dart';

class AppFormatters {
  static final NumberFormat _currencyFormat = NumberFormat.currency(
    symbol: '\$',
    decimalDigits: 2,
  );

  static String formatCurrency(num amount) {
    return _currencyFormat.format(amount);
  }

  static String formatDuration(Duration duration) {
    if (duration.isNegative) return '00:00:00';
    final hours = duration.inHours.toString().padLeft(2, '0');
    final minutes = (duration.inMinutes % 60).toString().padLeft(2, '0');
    final seconds = (duration.inSeconds % 60).toString().padLeft(2, '0');
    return '$hours:$minutes:$seconds';
  }

  static String formatDate(String? isoString) {
    if (isoString == null) return '';
    try {
      final dateTime = DateTime.parse(isoString);
      return DateFormat('MMM dd, yyyy • hh:mm a').format(dateTime);
    } catch (_) {
      return isoString;
    }
  }
}
