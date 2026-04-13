const categoryRepo = require('../repositories/categoryRepository');

const toSlug = (value) =>
    value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');

const getCategories = async (req, res) => {
    try {
        const categories = await categoryRepo.getAllCategories();
        res.status(200).json({ success: true, data: categories });
    } catch (error) {
        console.error('getCategories error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch categories' });
    }
};

const createCategory = async (req, res) => {
    try {
        const name = (req.body.name || '').trim();
        const parentId = req.body.parent_id ? Number(req.body.parent_id) : null;
        if (!name) {
            return res.status(400).json({ success: false, message: 'Category name is required' });
        }

        const slug = toSlug(name);
        if (!slug) {
            return res.status(400).json({ success: false, message: 'Invalid category name' });
        }

        const existed = await categoryRepo.findBySlug(slug);
        if (existed) {
            return res.status(400).json({ success: false, message: 'Category already exists' });
        }

        if (parentId) {
            const parent = await categoryRepo.findById(parentId);
            if (!parent) {
                return res.status(400).json({ success: false, message: 'Parent category not found' });
            }
        }

        const id = await categoryRepo.createCategory({ name, slug, parent_id: parentId });
        res.status(201).json({ success: true, data: { id, name, slug, parent_id: parentId } });
    } catch (error) {
        console.error('createCategory error:', error);
        res.status(500).json({ success: false, message: 'Failed to create category' });
    }
};

const updateCategory = async (req, res) => {
    try {
        const id = Number(req.params.id);
        const name = (req.body.name || '').trim();
        const parentId = req.body.parent_id ? Number(req.body.parent_id) : null;

        if (!name) {
            return res.status(400).json({ success: false, message: 'Category name is required' });
        }

        const category = await categoryRepo.findById(id);
        if (!category) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }

        const slug = toSlug(name);
        const duplicate = await categoryRepo.findBySlug(slug);
        if (duplicate && duplicate.id !== id) {
            return res.status(400).json({ success: false, message: 'Category already exists' });
        }

        if (parentId) {
            if (parentId === id) {
                return res.status(400).json({ success: false, message: 'Category cannot be its own parent' });
            }

            const parent = await categoryRepo.findById(parentId);
            if (!parent) {
                return res.status(400).json({ success: false, message: 'Parent category not found' });
            }
        }

        await categoryRepo.updateCategory(id, { name, slug, parent_id: parentId });
        res.status(200).json({ success: true, data: { id, name, slug, parent_id: parentId } });
    } catch (error) {
        console.error('updateCategory error:', error);
        res.status(500).json({ success: false, message: 'Failed to update category' });
    }
};

const deleteCategory = async (req, res) => {
    try {
        const id = Number(req.params.id);
        const category = await categoryRepo.findById(id);
        if (!category) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }

        const hasChildren = await categoryRepo.hasChildren(id);
        if (hasChildren) {
            return res.status(400).json({ success: false, message: 'Cannot delete category that has subcategories' });
        }

        await categoryRepo.deleteCategory(id);
        res.status(200).json({ success: true, message: 'Category deleted successfully' });
    } catch (error) {
        console.error('deleteCategory error:', error);
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(400).json({ success: false, message: 'Cannot delete category that is used by products' });
        }
        res.status(500).json({ success: false, message: 'Failed to delete category' });
    }
};

module.exports = {
    getCategories,
    createCategory,
    updateCategory,
    deleteCategory
};
