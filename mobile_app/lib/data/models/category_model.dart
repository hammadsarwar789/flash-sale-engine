import 'package:equatable/equatable.dart';

class CategoryModel extends Equatable {
  final dynamic id;
  final String name;
  final String slug;
  final String? description;

  const CategoryModel({
    required this.id,
    required this.name,
    required this.slug,
    this.description,
  });

  factory CategoryModel.fromJson(Map<String, dynamic> json) {
    final rawId = json['id'] ?? json['_id'] ?? json['category_id'] ?? '';
    final parsedId = (rawId is int) ? rawId : (int.tryParse(rawId.toString()) ?? rawId.toString());

    return CategoryModel(
      id: parsedId,
      name: json['name'] as String? ?? '',
      slug: json['slug'] as String? ?? '',
      description: json['description'] as String?,
    );
  }

  @override
  List<Object?> get props => [id, name, slug, description];
}
